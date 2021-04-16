import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import {spawn, ChildProcess} from 'child_process'
import {wait} from './wait'
import {execWithOutput, ExecuteOptions} from './utility'

export interface Options {
  memory: string
  uuid: string
  diskImage: fs.PathLike
  resourcesDiskImage: fs.PathLike
  cpuCount: number
  userboot: fs.PathLike
  firmware: fs.PathLike
}

export abstract class Vm {
  macAddress!: string
  ipAddress!: string

  protected options: Options

  private static readonly user = 'runner'
  private xhyvePath: fs.PathLike
  private vmProcess!: ChildProcess

  constructor(xhyvePath: fs.PathLike, options: Options) {
    this.xhyvePath = xhyvePath
    this.options = options
  }

  async init(): Promise<void> {
    core.info('Initializing VM')
    this.macAddress = await this.getMacAddress()
  }

  async run(): Promise<void> {
    core.info('Booting VM')
    this.vmProcess = spawn('sudo', this.xhyveArgs, {detached: true})
    this.ipAddress = await getIpAddressFromArp(this.macAddress)
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

    return await exec.exec('ssh', ['-t', `${Vm.user}@${this.ipAddress}`], {
      input: buffer,
      silent: options.silent,
      ignoreReturnCode: options.ignoreReturnCode
    })
  }

  async execute2(args: string[], intput: Buffer): Promise<number> {
    return await exec.exec(
      'ssh',
      ['-t', `${Vm.user}@${this.ipAddress}`].concat(args),
      {input: intput}
    )
  }

  async getMacAddress(): Promise<string> {
    core.debug('Getting MAC address')
    this.macAddress = (
      await execWithOutput('sudo', this.xhyveArgs.concat('-M'), {silent: true})
    )
      .trim()
      .slice(5)
    core.debug(`Found MAC address: '${this.macAddress}'`)
    return this.macAddress
  }

  get xhyveArgs(): string[] {
    // prettier-ignore
    return [
        this.xhyvePath.toString(),
        '-U', this.options.uuid,
        '-A',
        '-H',
        '-m', this.options.memory,
        '-c', this.options.cpuCount.toString(),
        '-s', '0:0,hostbridge',
        '-s', `2:0,${this.networkDevice}`,
        '-s', `4:0,virtio-blk,${this.options.diskImage}`,
        '-s', `4:1,virtio-blk,${this.options.resourcesDiskImage}`,
        '-s', '31,lpc',
        '-l', 'com1,stdio'
      ]
  }

  protected abstract get networkDevice(): string
}

export function extractIpAddress(
  arpOutput: string,
  macAddress: string
): string | undefined {
  core.debug('Extracing IP address')
  const matchResult = arpOutput
    .split('\n')
    .find(e => e.includes(macAddress))
    ?.match(/\((.+)\)/)

  const ipAddress = matchResult ? matchResult[1] : undefined

  if (ipAddress !== undefined) core.info(`Found IP address: '${ipAddress}'`)

  return ipAddress
}

export class FreeBsd extends Vm {
  get xhyveArgs(): string[] {
    // prettier-ignore
    return super.xhyveArgs.concat(
      '-f', `fbsd,${this.options.userboot},${this.options.diskImage},`
    )
  }

  protected async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -p now')
  }

  protected get networkDevice(): string {
    return 'virtio-net'
  }
}

export class OpenBsd extends Vm {
  get xhyveArgs(): string[] {
    // prettier-ignore
    return super.xhyveArgs.concat(
      '-l', `bootrom,${this.options.firmware}`,
      '-w'
    )
  }

  protected async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -h -p now')
  }

  protected get networkDevice(): string {
    return 'e1000'
  }
}

async function getIpAddressFromArp(macAddress: string): Promise<string> {
  core.info(`Getting IP address for MAC address: ${macAddress}`)
  for (let i = 0; i < 500; i++) {
    core.info('Waiting for IP to become available...')
    const arpOutput = await execWithOutput('arp', ['-a', '-n'], {silent: true})
    const ipAddress = extractIpAddress(arpOutput, macAddress)

    if (ipAddress !== undefined) return ipAddress

    await wait(1_000)
  }

  throw Error(`Failed to get IP address for MAC address: ${macAddress}`)
}
