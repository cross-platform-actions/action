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
import ResourceDisk from '../resource_disk'
import * as vmModule from '../vm'
import * as input from './input'
import * as shell from './shell'

export enum ImplementationKind {
  qemu,
  xhyve
}

export class Action {
  readonly tempPath: string
  readonly host: hostModule.Host
  readonly operatingSystem: os.OperatingSystem

  private readonly input = new input.Input()
  private readonly resourceDisk: ResourceDisk
  private readonly implementation: Implementation
  private readonly workDirectory
  private readonly sshDirectory: string
  private readonly privateSshKey: fs.PathLike
  private readonly publicSshKey: fs.PathLike
  private readonly privateSshKeyName = 'id_ed25519'
  private readonly targetDiskName = 'disk.raw'

  constructor() {
    this.host = hostModule.Host.create()
    this.tempPath = fs.mkdtempSync('/tmp/resources')
    const arch = architecture.Architecture.for(
      architecture.Kind.x86_64,
      this.host
    )

    this.operatingSystem = os.OperatingSystem.create(
      this.input.operatingSystem,
      arch,
      this.input.version
    )

    this.resourceDisk = ResourceDisk.for(this)

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
      `SendEnv ${this.input.environmentVariables}`,
      'PasswordAuthentication no'
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
    const sh =
      this.input.shell === shell.Shell.default
        ? '$SHELL'
        : shell.toString(this.input.shell)
    await vm.execute2(
      [
        'sh',
        '-c',
        `'cd "${process.env['GITHUB_WORKSPACE']}" && exec "${sh}" -e'`
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
