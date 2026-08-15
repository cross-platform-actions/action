import * as fs from 'fs'
import * as path from 'path'
import {spawn} from 'child_process'
import type {StdioOptions} from 'child_process'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as vm from './vm'
import {ExecuteOptions, ExecExecutor, Executor} from './utility'
import {Clock, SystemClock} from './clock'
import {Deadline} from './deadline'
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
  cpu: string
  machineType: string
  resourcesDiskImage: fs.PathLike
  firmware?: fs.PathLike
  // Where the hypervisor archive's firmware for QEMU's `microvm` machine type
  // would be, whether or not that archive carried one.
  microvmFirmware?: fs.PathLike
  // Where a bundled image's kernel is extracted to, whether or not the bundle
  // had one. A VM that can boot a kernel directly checks for it there.
  kernel?: fs.PathLike
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
  // The serial console log of the VM. It's written by the hypervisor, which
  // runs as root, so reading its content requires `sudo`.
  static readonly logFile = '/tmp/cross-platform-actions.log'
  private static _isRunning?: boolean

  readonly hypervisorPath: fs.PathLike
  protected vmProcess: Process = new LiveProcess()
  protected readonly architecture: architecture.Architecture
  protected readonly configuration: vm.Configuration
  protected readonly hypervisorDirectory: fs.PathLike
  protected readonly resourcesDirectory: fs.PathLike

  protected readonly input: Input

  private readonly executor: Executor
  private readonly clock: Clock
  private readonly vmFileSystemSynchronizer: VmFileSystemSynchronizer

  constructor(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    hypervisorBinary: fs.PathLike,
    arch: architecture.Architecture,
    input: Input,
    configuration: vm.Configuration,
    executor: Executor = new ExecExecutor(),
    clock: Clock = new SystemClock()
  ) {
    this.hypervisorDirectory = hypervisorDirectory
    this.resourcesDirectory = resourcesDirectory
    this.architecture = arch
    this.input = input
    this.configuration = configuration
    this.hypervisorPath = path.join(
      hypervisorDirectory.toString(),
      hypervisorBinary.toString()
    )
    this.executor = executor
    this.clock = clock
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
    core.info(`Booting VM of type: ${this.constructor.name}`)
    core.debug(this.command.join(' '))
    this.vmProcess = spawn('sudo', this.command, {
      detached: false,
      stdio: this.stdio
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

  // Bounds a single readiness probe, in seconds. User mode networking accepts
  // the forwarded connection before the guest's sshd does, so a probe sent too
  // early blocks rather than failing fast. The SSH ConnectTimeout a probe used
  // to get is ten seconds -- right for a command, but as a probe interval it
  // costs all ten whenever the guest is ready sooner.
  protected get readinessProbeTimeout(): number {
    return 2
  }

  // Waits, at most `timeout` seconds, for the VM to become ready.
  async wait(timeout: number): Promise<void> {
    const deadline = new Deadline(timeout, this.clock)
    const startedAt = this.clock.now()
    let attempts = 0

    while (!deadline.hasPassed) {
      attempts++
      if (await this.isReady()) {
        // The probe interval bounds how precisely this reflects when the guest
        // actually became reachable, so log both numbers.
        const seconds = ((this.clock.now() - startedAt) / 1000).toFixed(2)
        core.info(
          `The VM became ready after ${seconds} seconds ` +
            `and ${attempts} attempt(s)`
        )
        return
      }
      await deadline.sleepAtMost(1000)
    }

    throw Error(
      `Waiting for VM to become ready timed out after ${timeout} seconds ` +
        `and ${attempts} attempt(s)`
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
    const connectTimeout =
      options.connectTimeout === undefined
        ? []
        : ['-o', `ConnectTimeout=${options.connectTimeout}`]

    return await this.executor.execute(
      'ssh',
      ['-t', ...connectTimeout, this.sshTarget],
      {
        input: buffer,
        silent: options.silent,
        ignoreReturnCode: options.ignoreReturnCode
      }
    )
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

  protected get stdio(): StdioOptions {
    return ['ignore', 'inherit', 'inherit']
  }

  protected abstract get command(): string[]

  get user(): string {
    return 'runner'
  }

  get postSyncToVmCommand(): string {
    return ''
  }

  private async isReady(): Promise<boolean> {
    core.info('Waiting for VM to be ready...')
    const ready =
      (await this.execute('true', {
        ignoreReturnCode: true,
        connectTimeout: this.readinessProbeTimeout
      })) === 0
    if (ready) core.info('VM is ready')

    return ready
  }

  private get sshTarget(): string {
    return `${this.user}@${Vm.cpaHost}`
  }

  private extractHomeDirectory(directory: string): string {
    const components = directory.split(path.sep).slice(0, -2)
    return path.join('/', ...components)
  }
}
