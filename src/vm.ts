import * as fs from 'fs'
import * as path from 'path'
import {ChildProcess, spawn} from 'child_process'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as vm from './vm'
import {ExecuteOptions} from './utility'
import {wait} from './wait'
import * as architecture from './architecture'

export enum Accelerator {
  hvf,
  tcg
}

export interface Configuration {
  memory: string
  cpuCount: number
  diskImage: fs.PathLike
  ssHostPort: number

  // qemu
  cpu: string
  accelerator: Accelerator
  machineType: string

  // xhyve
  uuid: string
  resourcesDiskImage: fs.PathLike
  userboot: fs.PathLike
  firmware?: fs.PathLike
}

export abstract class Vm {
  ipAddress!: string

  static readonly user = 'runner'
  readonly hypervisorPath: fs.PathLike
  protected vmProcess!: ChildProcess
  protected readonly architecture: architecture.Architecture
  protected readonly configuration: vm.Configuration
  protected readonly hypervisorDirectory: fs.PathLike
  protected readonly resourcesDirectory: fs.PathLike

  constructor(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    hypervisorBinary: fs.PathLike,
    architecture: architecture.Architecture,
    configuration: vm.Configuration
  ) {
    this.hypervisorDirectory = hypervisorDirectory
    this.resourcesDirectory = resourcesDirectory
    this.architecture = architecture
    this.configuration = configuration
    this.hypervisorPath = path.join(
      hypervisorDirectory.toString(),
      hypervisorBinary.toString()
    )
  }

  async init(): Promise<void> {
    core.info('Initializing VM')
  }

  async run(): Promise<void> {
    core.info('Booting VM')
    core.debug(this.command.join(' '))
    this.vmProcess = spawn('sudo', this.command, {
      detached: false,
      stdio: ['ignore', 'inherit', 'inherit']
    })

    if (this.vmProcess.exitCode) {
      throw Error(
        `Failed to start VM process, exit code: ${this.vmProcess.exitCode}`
      )
    }

    this.ipAddress = await this.getIpAddress()
  }

  async wait(timeout: number): Promise<void> {
    for (let index = 0; index < timeout; index++) {
      core.info('Waiting for VM to be ready...')

      const result = await this.execute('true', {
        /*log: false,
          silent: true,*/
        ignoreReturnCode: true
      })

      if (result === 0) {
        core.info('VM is ready')
        return
      }
      await wait(1000)
    }

    throw Error(
      `Waiting for VM to become ready timed out after ${timeout} seconds`
    )
  }

  async stop(): Promise<void> {
    core.info('Shuting down VM')
    await this.shutdown()
  }

  async terminate(): Promise<number> {
    core.info('Terminating VM')
    return await exec.exec(
      'sudo',
      ['kill', '-s', 'TERM', this.vmProcess.pid.toString()],
      {ignoreReturnCode: true}
    )
  }

  protected async shutdown(): Promise<void> {
    throw Error('Not implemented')
  }

  async execute(
    command: string,
    options: ExecuteOptions = {}
  ): Promise<number> {
    const defaultOptions = {log: true}
    options = {...defaultOptions, ...options}
    if (options.log) core.info(`Executing command inside VM: ${command}`)
    const buffer = Buffer.from(command)

    return await exec.exec('ssh', this.executeBaseArgs, {
      input: buffer,
      silent: options.silent,
      ignoreReturnCode: options.ignoreReturnCode
    })
  }

  async execute2(args: string[], intput: Buffer): Promise<number> {
    return await exec.exec('ssh', this.executeBaseArgs.concat(args), {
      input: intput
    })
  }

  protected async getIpAddress(): Promise<string> {
    throw Error('Not implemented')
  }

  protected abstract get command(): string[]

  private get executeBaseArgs(): string[] {
    const baseArgs = ['-t', `${Vm.user}@${this.ipAddress}`]
    return core.isDebug() ? baseArgs.concat(['-vvv']) : baseArgs
  }
}
