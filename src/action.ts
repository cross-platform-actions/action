import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'

import * as cache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

import flatMap from 'array.prototype.flatmap'

import * as architecture from './architecture'
import * as hostModule from './host'
import * as os from './operating_system'
import * as vmModule from './vm'

export enum ImplementationKind {
  qemu,
  xhyve
}

export class Action {
  private readonly input = new Input()
  private readonly resourceDisk: ResourceDisk
  private readonly operatingSystem: os.OperatingSystem
  private readonly implementation: Implementation
  private readonly host: hostModule.Host
  private readonly workDirectory
  private readonly tempPath: string
  private readonly sshDirectory: string
  private readonly privateSshKey: fs.PathLike
  private readonly publicSshKey: fs.PathLike
  private readonly privateSshKeyName = 'id_ed25519'
  private readonly targetDiskName = 'disk.raw'

  constructor() {
    this.host = hostModule.Host.create()
    this.tempPath = fs.mkdtempSync('/tmp/resources')
    this.resourceDisk = new ResourceDisk(this.tempPath, this.host)

    this.operatingSystem = os.OperatingSystem.create(
      this.input.operatingSystem,
      architecture.Kind.x86_64,
      this.input.version
    )

    this.implementation = this.getImplementation(
      this.operatingSystem.actionImplementationKind
    )

    this.workDirectory = this.host.workDirectory
    this.sshDirectory = path.join(this.getHomeDirectory(), '.ssh')
    this.privateSshKey = path.join(this.tempPath, this.privateSshKeyName)
    this.publicSshKey = `${this.privateSshKey}.pub`
  }

  async run(): Promise<void> {
    core.debug('Running action')
    const [diskImagePath, hypervisorArchivePath, resourcesArchivePath] =
      await Promise.all([
        this.downloadDiskImage(),
        this.download('hypervisor', this.operatingSystem.hypervisorUrl),
        this.download('resources', this.operatingSystem.resourcesUrl),
        this.setupSSHKey()
      ])

    const [firmwareDirectory, resourcesDirectory] = await Promise.all([
      this.unarchiveHypervisor(hypervisorArchivePath),
      this.unarchive('resources', resourcesArchivePath)
    ])

    const hypervisorDirectory = path.join(firmwareDirectory, 'bin')

    const vmPromise = this.creareVm(
      hypervisorDirectory,
      firmwareDirectory,
      resourcesDirectory,
      diskImagePath
    )

    const excludes = [
      resourcesArchivePath,
      resourcesDirectory,
      hypervisorArchivePath,
      hypervisorDirectory,
      firmwareDirectory,
      diskImagePath
    ].map(p => p.slice(this.workDirectory.length + 1))

    const vm = await vmPromise

    await vm.init()
    try {
      await vm.run()
      this.configSSH(vm.ipAddress)
      await vm.wait(60)
      await this.operatingSystem.setupWorkDirectory(vm, this.workDirectory)
      await this.syncFiles(
        vm.ipAddress,
        this.targetDiskName,
        this.resourceDisk.diskPath,
        ...excludes
      )
      core.info('VM is ready')
      try {
        await this.runCommand(vm)
      } finally {
        await this.syncBack(vm.ipAddress)
      }
      await vm.stop()
    } finally {
      await vm.terminate()
      fs.rmdirSync(this.tempPath, {recursive: true})
    }
  }

  async downloadDiskImage(): Promise<string> {
    core.info(
      `Downloading disk image: ${this.operatingSystem.virtualMachineImageUrl}`
    )
    const result = await cache.downloadTool(
      this.operatingSystem.virtualMachineImageUrl
    )
    core.info(`Downloaded file: ${result}`)

    return result
  }

  async download(type: string, url: string): Promise<string> {
    core.info(`Downloading ${type}: ${url}`)
    const result = await cache.downloadTool(url)
    core.info(`Downloaded file: ${result}`)

    return result
  }

  async creareVm(
    hypervisorDirectory: string,
    firmwareDirectory: string,
    resourcesDirectory: string,
    diskImagePath: string
  ): Promise<vmModule.Vm> {
    await this.operatingSystem.prepareDisk(
      diskImagePath,
      this.targetDiskName,
      resourcesDirectory
    )

    return this.operatingSystem.createVirtualMachine(
      hypervisorDirectory,
      resourcesDirectory,
      firmwareDirectory,
      {
        memory: '4G',
        cpuCount: 2,
        diskImage: path.join(resourcesDirectory, this.targetDiskName),
        ssHostPort: this.operatingSystem.ssHostPort,

        // qemu
        cpu: this.operatingSystem.architecture.cpu,
        accelerator: this.operatingSystem.architecture.accelerator,
        machineType: this.operatingSystem.architecture.machineType,

        // xhyve
        uuid: '864ED7F0-7876-4AA7-8511-816FABCFA87F',
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

  configSSH(ipAddress: string): void {
    core.debug('Configuring SSH')

    if (!fs.existsSync(this.sshDirectory))
      fs.mkdirSync(this.sshDirectory, {recursive: true, mode: 0o700})

    const lines = [
      'StrictHostKeyChecking=accept-new',
      `Host ${ipAddress}`,
      `Port ${this.operatingSystem.ssHostPort}`,
      `IdentityFile ${this.privateSshKey}`,
      'SendEnv CI GITHUB_*',
      `SendEnv ${this.input.environmentVariables}`
    ].join('\n')

    fs.appendFileSync(path.join(this.sshDirectory, 'config'), `${lines}\n`)
    this.implementation.configSSH()
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

  private async syncFiles(
    ipAddress: string,
    ...excludePaths: string[]
  ): Promise<void> {
    core.debug(`Syncing files to VM, excluding: ${excludePaths}`)
    // prettier-ignore
    await exec.exec('rsync', [
      '-auvzrtopg',
      '--exclude', '_actions/cross-platform-actions/action',
      ...flatMap(excludePaths, p => ['--exclude', p]),
      `${this.workDirectory}/`,
      `runner@${ipAddress}:work`
    ])
  }

  private async syncBack(ipAddress: string): Promise<void> {
    core.info('Syncing back files')
    // prettier-ignore
    await exec.exec('rsync', [
      '-uvzrtopg',
      `runner@${ipAddress}:work/`,
      this.workDirectory
    ])
  }

  private async runCommand(vm: vmModule.Vm): Promise<void> {
    core.info(`Run: ${this.input.run}`)
    const shell =
      this.input.shell === Shell.default ? '$SHELL' : toString(this.input.shell)
    await vm.execute2(
      [
        'sh',
        '-c',
        `'cd "${process.env['GITHUB_WORKSPACE']}" && exec "${shell}" -e'`
      ],
      Buffer.from(this.input.run)
    )
  }

  private getImplementation(kind: ImplementationKind): Implementation {
    switch (kind) {
      case ImplementationKind.qemu:
        return new QemuImplementation(this)
      case ImplementationKind.xhyve:
        return new XhyveImplementation(this)
      default:
        throw Error(`Unhandled implementation kind: $`)
    }
  }

  private getHomeDirectory(): string {
    const homeDirectory = process.env['HOME']

    if (homeDirectory === undefined)
      throw Error('Failed to get the home direcory')

    return homeDirectory
  }
}

export abstract class Implementation {
  protected readonly action: Action

  constructor(action: Action) {
    this.action = action
  }

  abstract configSSH(): void

  protected get resourceDisk(): ResourceDisk {
    return this.action['resourceDisk']
  }

  protected get publicSshKey(): fs.PathLike {
    return this.action['publicSshKey']
  }

  protected get sshDirectory(): string {
    return this.action['sshDirectory']
  }
}

class XhyveImplementation extends Implementation {
  configSSH(): void {
    // noop
  }
}

class QemuImplementation extends Implementation {
  configSSH(): void {
    const authorizedKeysPath = path.join(this.sshDirectory, 'authorized_keys')
    const publicKeyContent = fs.readFileSync(this.publicSshKey)
    fs.appendFileSync(authorizedKeysPath, publicKeyContent)
  }
}

class ResourceDisk {
  readonly diskPath: string

  private readonly mountName = 'RES'
  private mountPath!: string

  private readonly host: hostModule.Host
  private readonly tempPath: string
  private devicePath!: string

  constructor(tempPath: string, host: hostModule.Host) {
    this.host = host
    this.tempPath = tempPath
    this.diskPath = path.join(this.tempPath, 'res.raw')
  }

  async create(): Promise<string> {
    core.debug('Creating resource disk')
    await this.createDiskFile()
    this.devicePath = await this.createDiskDevice()
    await this.partitionDisk()

    const mountPath = path.join(this.tempPath, 'mount/RES')

    return (this.mountPath = await this.mountDisk(mountPath))
  }

  async unmount(): Promise<void> {
    await this.unmountDisk()
    await this.detachDevice()
  }

  private async createDiskFile(): Promise<void> {
    core.debug('Creating disk file')
    await this.host.createDiskFile('40m', this.diskPath)
  }

  private async createDiskDevice(): Promise<string> {
    core.debug('Creating disk file')
    return await this.host.createDiskDevice(this.diskPath)
  }

  private async partitionDisk(): Promise<void> {
    core.debug('Partitioning disk')
    await this.host.partitionDisk(this.devicePath, this.mountName)
  }

  private async mountDisk(mountPath: string): Promise<string> {
    core.debug('mounting disk')
    return await this.host.mountDisk(this.devicePath, mountPath)
  }

  private async unmountDisk(): Promise<void> {
    core.debug('Unmounting disk')
    await exec.exec('sudo', ['umount', this.mountPath])
  }

  private async detachDevice(): Promise<void> {
    core.debug('Detaching device')
    await this.host.detachDevice(this.devicePath)
  }
}

class Input {
  private run_?: string
  private operatingSystem_?: os.Kind
  private version_?: string
  private shell_?: Shell
  private environmentVariables_?: string
  private architecture_?: architecture.Kind

  get version(): string {
    if (this.version_ !== undefined) return this.version_
    return (this.version_ = core.getInput('version', {
      required: true
    }))
  }

  get operatingSystem(): os.Kind {
    if (this.operatingSystem_ !== undefined) return this.operatingSystem_
    const input = core.getInput('operating_system', {required: true})
    const kind = os.toKind(input)
    core.debug(`operating_system input: '${input}'`)
    core.debug(`kind: '${kind}'`)
    if (kind === undefined) throw Error(`Invalid operating system: ${input}`)
    return (this.operatingSystem_ = kind)
  }

  get run(): string {
    if (this.run_ !== undefined) return this.run_
    return (this.run_ = core.getInput('run', {required: true}))
  }

  get shell(): Shell {
    if (this.shell_ !== undefined) return this.shell_
    const input = core.getInput('shell')
    const shell = input ? toShell(input) : Shell.default
    if (shell === undefined) throw Error(`Invalid shell: ${input}`)
    return (this.shell_ = shell)
  }

  get environmentVariables(): string {
    if (this.environmentVariables_ !== undefined)
      return this.environmentVariables_

    return (this.environmentVariables_ = core.getInput('environment_variables'))
  }

  get architecture(): architecture.Kind {
    if (this.architecture_ !== undefined) return this.architecture_

    const input = core.getInput('architecture')
    core.debug(`architecture input: '${input}'`)
    if (input === undefined || input === '')
      return (this.architecture_ = architecture.Kind.x86_64)

    const kind = architecture.toKind(input)
    core.debug(`kind: '${kind}'`)

    if (kind === undefined) throw Error(`Invalid architecture: ${input}`)

    return (this.architecture_ = kind)
  }
}

enum Shell {
  default,
  bash,
  sh
}

const stringToShell: ReadonlyMap<string, Shell> = (() => {
  const map = new Map<string, Shell>()
  map.set('default', Shell.default)
  map.set('bash', Shell.bash)
  map.set('sh', Shell.sh)
  return map
})()

export function toShell(value: string): Shell | undefined {
  return stringToShell.get(value.toLowerCase())
}

export function toString(shell: Shell): string {
  for (const [key, value] of stringToShell) {
    if (value === shell) return key
  }

  throw Error(`Unreachable: missing Shell.${shell} in 'stringToShell'`)
}
