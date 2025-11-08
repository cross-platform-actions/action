import * as fs from 'fs'
import * as path from 'path'
import {spawn} from 'child_process'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as vm from './vm'
import {ExecuteOptions, ExecExecutor, Executor} from './utility'
import {wait} from './wait'
import * as architecture from './architecture'
import {Input} from './action/input'
import {
  DefaultVmFileSystemSynchronizer,
  VmFileSystemSynchronizer
} from './vm_file_system_synchronizer'

export interface Configuration {
  memory: string
  cpuCount: number
  diskImage: fs.PathLike
  ssHostPort: number

  // qemu
  cpu: string
  machineType: string

  // xhyve
  uuid: string
  resourcesDiskImage: fs.PathLike
  userboot: fs.PathLike
  firmware?: fs.PathLike
}

interface Process {
  readonly pid: number
  readonly exitCode: number | null

  unref(): void
}

class LiveProcess implements Process {
  readonly exitCode: number | null = null
  private _pid?: number

  get pid(): number {
    if (this._pid !== undefined) return this._pid

    return (this._pid = +fs.readFileSync(Vm.pidfile, 'utf8'))
  }

  unref(): void {
    // noop
  }
}

export abstract class Vm {
  ipAddress!: string

  static readonly user = 'runner'
  static readonly cpaHost = 'cross_platform_actions_host'
  static readonly pidfile = '/tmp/cross-platform-actions.pid'
  private static _isRunning?: boolean

  readonly hypervisorPath: fs.PathLike
  protected readonly logFile: fs.PathLike = '/tmp/cross-platform-actions.log'
  protected vmProcess: Process = new LiveProcess()
  protected readonly architecture: architecture.Architecture
  protected readonly configuration: vm.Configuration
  protected readonly hypervisorDirectory: fs.PathLike
  protected readonly resourcesDirectory: fs.PathLike

  protected readonly input: Input

  private readonly executor: Executor
  private readonly vmFileSystemSynchronizer: VmFileSystemSynchronizer

  constructor(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    hypervisorBinary: fs.PathLike,
    architecture: architecture.Architecture,
    input: Input,
    configuration: vm.Configuration,
    executor: Executor = new ExecExecutor()
  ) {
    this.hypervisorDirectory = hypervisorDirectory
    this.resourcesDirectory = resourcesDirectory
    this.architecture = architecture
    this.input = input
    this.configuration = configuration
    this.hypervisorPath = path.join(
      hypervisorDirectory.toString(),
      hypervisorBinary.toString()
    )
    this.executor = executor
    this.vmFileSystemSynchronizer = new DefaultVmFileSystemSynchronizer({
      input,
      user: this.user,
      guestHomeDirectory: this.homeDirectory,
      hostHomeDirectory: this.hostHomeDirectory,
      executor
    })
  }

  static get isRunning(): boolean {
    if (this._isRunning !== undefined) return this._isRunning

    return (this._isRunning = fs.existsSync(Vm.pidfile))
  }

  get homeDirectory(): string {
    return this.extractHomeDirectory(this.workDirectory)
  }

  get hostHomeDirectory(): string {
    return this.extractHomeDirectory(process.env['GITHUB_WORKSPACE'] ?? '')
  }

  get workDirectory(): string {
    return process.env['GITHUB_WORKSPACE'] ?? ''
  }

  async init(): Promise<void> {
    core.info('Initializing VM')
  }

  async run(): Promise<void> {
    core.info('Booting VM of type: ' + this.constructor.name)
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

    fs.writeFileSync(Vm.pidfile, this.vmProcess.pid.toString())

    if (!this.input.shutdownVm) {
      this.vmProcess.unref()
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

  async terminate(): Promise<number> {
    core.info('Terminating VM')
    return await exec.exec(
      'sudo',
      ['kill', '-s', 'TERM', this.vmProcess.pid.toString()],
      {ignoreReturnCode: true}
    )
  }

  async setupWorkDirectory(
    homeDirectory: string,
    workDirectory: string
  ): Promise<void> {
    const homeDirectoryLinuxHost = `/home/${Vm.user}/work`

    await this.execute(
      `rm -rf '${homeDirectoryLinuxHost}' && ` +
        `sudo mkdir -p '${workDirectory}' && ` +
        `sudo chown -R '${Vm.user}' '${homeDirectory}' && ` +
        `ln -sf '${homeDirectory}' '${homeDirectoryLinuxHost}'`
    )
  }

  async execute(
    command: string,
    options: ExecuteOptions = {}
  ): Promise<number> {
    const defaultOptions = {log: true}
    options = {...defaultOptions, ...options}
    if (options.log) core.info(`Executing command inside VM: ${command}`)
    const buffer = Buffer.from(command)

    return await this.executor.execute('ssh', ['-t', this.sshTarget], {
      input: buffer,
      silent: options.silent,
      ignoreReturnCode: options.ignoreReturnCode
    })
  }

  async execute2(args: string[], intput: Buffer): Promise<number> {
    return await this.executor.execute(
      'ssh',
      ['-t', this.sshTarget].concat(args),
      {
        input: intput
      }
    )
  }

  async synchronizePaths(...excludePaths: string[]): Promise<void> {
    await this.vmFileSystemSynchronizer.synchronizePaths(...excludePaths)
  }

  async synchronizeBack(): Promise<void> {
    await this.vmFileSystemSynchronizer.synchronizeBack()
  }

  protected async getIpAddress(): Promise<string> {
    throw Error('Not implemented')
  }

  protected abstract get command(): string[]

  protected get user(): string {
    return 'runner'
  }

  private get sshTarget(): string {
    return `${this.user}@${Vm.cpaHost}`
  }

  private extractHomeDirectory(directory: string): string {
    const components = directory.split(path.sep).slice(0, -2)
    return path.join('/', ...components)
  }
}
