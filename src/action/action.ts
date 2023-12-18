import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'

import * as cache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

import flatMap from 'array.prototype.flatmap'

import * as architecture from '../architecture'
import * as hostModule from '../host'
import * as os from '../operating_system'
import * as os_factory from '../operating_systems/factory'
import ResourceDisk from '../resource_disk'
import * as vmModule from '../vm'
import * as input from './input'
import * as shell from './shell'
import * as utility from '../utility'
import {SyncDirection} from './sync_direction'
import {execSync} from 'child_process'

export class Action {
  readonly tempPath: string
  readonly host: hostModule.Host
  readonly operatingSystem: os.OperatingSystem
  readonly inputHashPath = '/tmp/cross-platform-actions-input-hash'
  readonly input = new input.Input()

  private readonly cpaHost: string
  private readonly resourceDisk: ResourceDisk
  private readonly sshDirectory: string
  private readonly privateSshKey: fs.PathLike
  private readonly publicSshKey: fs.PathLike
  private readonly privateSshKeyName = 'id_ed25519'
  private readonly targetDiskName = 'disk.raw'

  constructor() {
    this.cpaHost = vmModule.Vm.cpaHost
    this.host = hostModule.Host.create()
    this.tempPath = fs.mkdtempSync('/tmp/resources')
    const arch = architecture.Architecture.for(
      this.input.architecture,
      this.host,
      this.input.operatingSystem,
      this.input.hypervisor
    )

    this.operatingSystem = this.createOperatingSystem(arch)
    this.resourceDisk = ResourceDisk.for(this)

    this.sshDirectory = path.join(this.getHomeDirectory(), '.ssh')
    this.privateSshKey = path.join(this.tempPath, this.privateSshKeyName)
    this.publicSshKey = `${this.privateSshKey}.pub`
  }

  async run(): Promise<void> {
    core.startGroup('Setting up VM')
    core.debug('Running action')
    const runPreparer = this.createRunPreparer()
    runPreparer.createInputHash()
    runPreparer.validateInputHash()

    const [diskImagePath, hypervisorArchivePath, resourcesArchivePath] =
      await Promise.all([...runPreparer.download(), runPreparer.setupSSHKey()])

    const [firmwareDirectory, resourcesDirectory] = await Promise.all(
      runPreparer.unarchive(hypervisorArchivePath, resourcesArchivePath)
    )

    const hypervisorDirectory = path.join(firmwareDirectory, 'bin')
    const excludes = [
      resourcesArchivePath,
      resourcesDirectory,
      hypervisorArchivePath,
      hypervisorDirectory,
      firmwareDirectory,
      diskImagePath
    ].map(p => p.slice(this.homeDirectory.length + 1))

    const vm = this.creareVm(
      hypervisorDirectory,
      firmwareDirectory,
      resourcesDirectory,
      {
        memory: this.input.memory,
        cpuCount: this.input.cpuCount
      }
    )

    const implementation = this.getImplementation(vm)
    await implementation.prepareDisk(diskImagePath, resourcesDirectory)

    await implementation.init()
    try {
      await implementation.run()
      implementation.configSSH(vm.ipAddress)
      await implementation.wait(120)
      await implementation.setupWorkDirectory(
        this.homeDirectory,
        this.workDirectory
      )
      await this.syncFiles(
        this.targetDiskName,
        this.resourceDisk.diskPath,
        ...excludes
      )
      core.info('VM is ready')
      try {
        core.endGroup()
        await this.runCommand(vm)
      } finally {
        core.startGroup('Tearing down VM')
        await this.syncBack()
      }
    } finally {
      try {
        if (this.input.shutdownVm) {
          await vm.terminate()
        }
      } finally {
        core.endGroup()
      }
    }
  }

  async downloadDiskImage(): Promise<string> {
    const imageURL =
      this.input.imageURL !== ''
        ? this.input.imageURL
        : this.operatingSystem.virtualMachineImageUrl
    core.info(`Downloading disk image: ${imageURL}`)
    const result = await cache.downloadTool(imageURL)
    core.info(`Downloaded file: ${result}`)

    return result
  }

  async download(type: string, url: string): Promise<string> {
    core.info(`Downloading ${type}: ${url}`)
    const result = await cache.downloadTool(url)
    core.info(`Downloaded file: ${result}`)

    return result
  }

  creareVm(
    hypervisorDirectory: string,
    firmwareDirectory: string,
    resourcesDirectory: string,
    config: os.ExternalVmConfiguration
  ): vmModule.Vm {
    return this.operatingSystem.createVirtualMachine(
      hypervisorDirectory,
      resourcesDirectory,
      firmwareDirectory,
      this.input,
      {
        ...config,
        diskImage: path.join(resourcesDirectory, this.targetDiskName),

        // xhyve
        resourcesDiskImage: this.resourceDisk.diskPath,
        userboot: path.join(firmwareDirectory, 'userboot.so')
      }
    )
  }

  async unarchive(type: string, archivePath: string): Promise<string> {
    core.info(`Unarchiving ${type}: ${archivePath}`)
    return cache.extractTar(archivePath, undefined, '-x')
  }

  async unarchiveHypervisor(archivePath: string): Promise<string> {
    const hypervisorDirectory = await this.unarchive('hypervisor', archivePath)
    return path.join(hypervisorDirectory)
  }

  private get customSendEnv(): string {
    const env = this.input.environmentVariables
    return env ? `SendEnv ${env}` : ''
  }

  private async setupSSHKey(): Promise<void> {
    const mountPath = this.resourceDisk.create()
    await exec.exec('ssh-keygen', [
      '-t',
      'ed25519',
      '-f',
      this.privateSshKey.toString(),
      '-q',
      '-N',
      ''
    ])
    fs.copyFileSync(this.publicSshKey, path.join(await mountPath, 'keys'))
    this.resourceDisk.unmount()
  }

  private get syncVerboseFlag(): string {
    return core.isDebug() ? 'v' : ''
  }

  private get homeDirectory(): string {
    const components = this.workDirectory.split(path.sep).slice(0, -2)
    return path.join('/', ...components)
  }

  private get workDirectory(): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return process.env['GITHUB_WORKSPACE']!
  }

  private get shouldSyncFiles(): boolean {
    return (
      this.input.syncFiles === SyncDirection.runner_to_vm ||
      this.input.syncFiles === SyncDirection.both
    )
  }

  private get shouldSyncBack(): boolean {
    return (
      this.input.syncFiles === SyncDirection.vm_to_runner ||
      this.input.syncFiles === SyncDirection.both
    )
  }

  private async syncFiles(...excludePaths: string[]): Promise<void> {
    if (!this.shouldSyncFiles) {
      return
    }

    core.debug(`Syncing files to VM, excluding: ${excludePaths}`)
    // prettier-ignore
    await exec.exec('rsync', [
      `-auzrtopg${this.syncVerboseFlag}`,
      '--exclude', '_actions/cross-platform-actions/action',
      ...flatMap(excludePaths, p => ['--exclude', p]),
      `${this.homeDirectory}/`,
      `runner@${this.cpaHost}:work`
    ])
  }

  private async syncBack(): Promise<void> {
    if (!this.shouldSyncBack) return

    core.info('Syncing back files')
    // prettier-ignore
    await exec.exec('rsync', [
      `-uzrtopg${this.syncVerboseFlag}`,
      `runner@${this.cpaHost}:work/`,
      this.homeDirectory
    ])
  }

  private async runCommand(vm: vmModule.Vm): Promise<void> {
    utility.group('Running command', () => core.info(this.input.run))

    const sh =
      this.input.shell === shell.Shell.default
        ? '$SHELL'
        : shell.toString(this.input.shell)
    await vm.execute2(
      ['sh', '-c', `'cd "${this.workDirectory}" && exec "${sh}" -e'`],
      Buffer.from(this.input.run)
    )
  }

  private getHomeDirectory(): string {
    const homeDirectory = process.env['HOME']

    if (homeDirectory === undefined)
      throw Error('Failed to get the home direcory')

    return homeDirectory
  }

  private createOperatingSystem(
    arch: architecture.Architecture
  ): os.OperatingSystem {
    return os_factory.Factory.for(this.input.operatingSystem, arch).create(
      this.input.version,
      this.input.hypervisor
    )
  }

  private getImplementation(vm: vmModule.Vm): Implementation {
    const cls = implementationFor({isRunning: vmModule.Vm.isRunning})
    core.debug(`Using action implementation: ${cls.name}`)
    return new cls(this, vm)
  }

  private createRunPreparer(): RunPreparer {
    const cls = runPreparerFor({isRunning: vmModule.Vm.isRunning})
    core.debug(`Using run preparer: ${cls.name}`)
    return new cls(this, this.operatingSystem)
  }
}

function implementationFor({
  isRunning
}: {
  isRunning: boolean
}): utility.Class<Implementation> {
  return isRunning ? LiveImplementation : InitialImplementation
}

function runPreparerFor({
  isRunning
}: {
  isRunning: boolean
}): utility.Class<RunPreparer> {
  return isRunning ? LiveRunPreparer : InitialRunPreparer
}

interface RunPreparer {
  createInputHash(): void
  validateInputHash(): void
  download(): [Promise<string>, Promise<string>, Promise<string>]
  setupSSHKey(): Promise<void>
  unarchive(
    hypervisorArchivePath: string,
    resourcesArchivePath: string
  ): [Promise<string>, Promise<string>]
}

// Used when the VM is not running
class InitialRunPreparer implements RunPreparer {
  private readonly action: Action
  private readonly operatingSystem: os.OperatingSystem

  constructor(action: Action, operatingSystem: os.OperatingSystem) {
    this.action = action
    this.operatingSystem = operatingSystem
  }

  createInputHash(): void {
    const hash = this.action['input'].toHash()
    core.debug(`Input hash: ${hash}`)
    fs.writeFileSync(this.action.inputHashPath, hash)
  }

  validateInputHash(): void {
    // noop
  }

  download(): [Promise<string>, Promise<string>, Promise<string>] {
    return [
      this.action.downloadDiskImage(),
      this.action.download('hypervisor', this.operatingSystem.hypervisorUrl),
      this.action.download('resources', this.operatingSystem.resourcesUrl)
    ]
  }

  async setupSSHKey(): Promise<void> {
    await this.action['setupSSHKey']()
  }

  unarchive(
    hypervisorArchivePath: string,
    resourcesArchivePath: string
  ): [Promise<string>, Promise<string>] {
    return [
      this.action.unarchiveHypervisor(hypervisorArchivePath),
      this.action.unarchive('resources', resourcesArchivePath)
    ]
  }
}

// Used when the VM is already running
class LiveRunPreparer implements RunPreparer {
  private readonly action: Action

  constructor(action: Action) {
    this.action = action
  }

  createInputHash(): void {
    // noop
  }

  validateInputHash(): void {
    const hash = this.action.input.toHash()
    core.debug(`Input hash: ${hash}`)
    const initialHash = fs.readFileSync(this.action.inputHashPath, 'utf8')

    if (hash !== initialHash)
      throw Error("The inputs don't match the initial invocation of the action")
  }

  download(): [Promise<string>, Promise<string>, Promise<string>] {
    return [Promise.resolve(''), Promise.resolve(''), Promise.resolve('')]
  }

  async setupSSHKey(): Promise<void> {
    // noop
  }

  unarchive(): [Promise<string>, Promise<string>] {
    return [Promise.resolve(''), Promise.resolve('')]
  }
}

interface Implementation {
  prepareDisk(diskImagePath: string, resourcesDirectory: string): Promise<void>
  init(): Promise<void>
  run(): Promise<void>
  wait(timeout: number): Promise<void>

  setupWorkDirectory(
    homeDirectory: string,
    workDirectory: string
  ): Promise<void>

  configSSH(ipAddress: string): void
}

class LiveImplementation implements Implementation {
  async prepareDisk(
    _diskImagePath: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _resourcesDirectory: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    // noop
  }

  async init(): Promise<void> {
    // noop
  }

  async run(): Promise<void> {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async wait(_timeout: number): Promise<void> {
    // noop
  }

  async setupWorkDirectory(
    _homeDirectory: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _workDirectory: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configSSH(_ipAddress: string): void {
    // noop
  }
}

class InitialImplementation implements Implementation {
  private readonly action: Action
  private readonly vm: vmModule.Vm

  constructor(action: Action, vm: vmModule.Vm) {
    this.action = action
    this.vm = vm
  }

  async prepareDisk(
    diskImagePath: string,
    resourcesDirectory: string
  ): Promise<void> {
    await this.action.operatingSystem.prepareDisk(
      diskImagePath,
      this.targetDiskName,
      resourcesDirectory
    )
  }

  async init(): Promise<void> {
    await this.vm.init()
  }

  async run(): Promise<void> {
    await this.vm.run()
  }

  async wait(timeout: number): Promise<void> {
    await this.vm.wait(timeout)
  }

  async setupWorkDirectory(
    homeDirectory: string,
    workDirectory: string
  ): Promise<void> {
    await this.vm.setupWorkDirectory(homeDirectory, workDirectory)
  }

  private get targetDiskName(): string {
    return this.action['targetDiskName']
  }

  configSSH(ipAddress: string): void {
    core.debug('Configuring SSH')

    this.createSSHConfig()
    this.setupAuthorizedKeys()
    this.setupHostname(ipAddress)
  }

  private createSSHConfig(): void {
    if (!fs.existsSync(this.sshDirectory))
      fs.mkdirSync(this.sshDirectory, {recursive: true, mode: 0o700})

    const lines = [
      'StrictHostKeyChecking=accept-new',
      `Host ${this.cpaHost}`,
      `Port ${this.operatingSystem.ssHostPort}`,
      `IdentityFile ${this.privateSshKey}`,
      'SendEnv CI GITHUB_*',
      this.customSendEnv,
      'PasswordAuthentication no'
    ].join('\n')

    fs.appendFileSync(path.join(this.sshDirectory, 'config'), `${lines}\n`)
  }

  private setupAuthorizedKeys(): void {
    const authorizedKeysPath = path.join(this.sshDirectory, 'authorized_keys')
    const publicKeyContent = fs.readFileSync(this.publicSshKey)
    fs.appendFileSync(authorizedKeysPath, publicKeyContent)
  }

  private get publicSshKey(): fs.PathLike {
    return this.action['publicSshKey']
  }

  private get sshDirectory(): string {
    return this.action['sshDirectory']
  }

  private get cpaHost(): string {
    return this.action['cpaHost']
  }

  private get operatingSystem(): os.OperatingSystem {
    return this.action['operatingSystem']
  }

  private get privateSshKey(): fs.PathLike {
    return this.action['privateSshKey']
  }

  private get customSendEnv(): string {
    return this.action['customSendEnv']
  }

  private setupHostname(ipAddress: string): void {
    if (ipAddress === 'localhost') ipAddress = '127.0.0.1'

    execSync(
      `sudo bash -c 'printf "${ipAddress} ${this.cpaHost}\n" >> /etc/hosts'`
    )
  }
}
