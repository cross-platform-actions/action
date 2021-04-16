import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'

import * as cache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

import flatMap from 'array.prototype.flatmap'

import * as xhyve from './xhyve_vm'
import * as os from './operating_system'
import {execWithOutput} from './utility'
import {env} from 'process'

export default class Action {
  private readonly resourceUrl =
    'https://github.com/cross-platform-actions/resources/releases/download/v0.0.1/resources.tar'

  private readonly workDirectory = '/Users/runner/work'
  private readonly input = new Input()

  private readonly targetDiskName = 'disk.raw'
  private readonly tempPath: string
  private readonly privateSshKey: fs.PathLike
  private readonly publicSshKey: fs.PathLike
  private readonly resourceDisk: ResourceDisk
  private readonly operatingSystem: os.OperatingSystem

  constructor() {
    this.tempPath = fs.mkdtempSync('resources')
    this.privateSshKey = path.join(this.tempPath, 'ed25519')
    this.publicSshKey = `${this.privateSshKey}.pub`
    this.resourceDisk = new ResourceDisk(this.tempPath)
    this.operatingSystem = os.OperatingSystem.create(
      this.input.operatingSystem,
      os.Architecture.x86_64,
      this.input.version
    )
  }

  async run(): Promise<void> {
    core.debug('Running action')
    const [diskImagePath, resourcesArchivePath] = await Promise.all([
      this.downloadDiskImage(),
      this.downloadResources(),
      this.setupSSHKey()
    ])

    const resourcesDirectory = await this.unarchiveResoruces(
      resourcesArchivePath
    )
    const vmPromise = this.creareVm(resourcesDirectory, diskImagePath)
    const excludes = [
      resourcesDirectory,
      diskImagePath,
      resourcesArchivePath
    ].map(p => p.slice(this.workDirectory.length + 1))

    const vm = await vmPromise

    await vm.init()
    try {
      await vm.run()
      this.configSSH(vm.ipAddress)
      await vm.wait(60)
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

  async downloadResources(): Promise<string> {
    core.info(`Downloading resources: ${this.resourceUrl}`)
    const result = await cache.downloadTool(this.resourceUrl)
    core.info(`Downloaded file: ${result}`)

    return result
  }

  async creareVm(
    resourcesDirectory: string,
    diskImagePath: string
  ): Promise<xhyve.Vm> {
    await this.operatingSystem.prepareDisk(
      diskImagePath,
      this.targetDiskName,
      resourcesDirectory
    )

    const xhyvePath = path.join(resourcesDirectory, 'xhyve')
    return this.operatingSystem.createVirtualMachine(xhyvePath, {
      memory: '4G',
      cpuCount: 2,
      diskImage: path.join(resourcesDirectory, this.targetDiskName),
      resourcesDiskImage: this.resourceDisk.diskPath,
      uuid: '864ED7F0-7876-4AA7-8511-816FABCFA87F',
      userboot: path.join(resourcesDirectory, 'userboot.so'),
      firmware: path.join(resourcesDirectory, 'uefi.fd')
    })
  }

  async setupSSHKey(): Promise<void> {
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

  async unarchiveResoruces(resourcesArchivePath: string): Promise<string> {
    core.info(`Unarchiving resoruces: ${resourcesArchivePath}`)
    return cache.extractTar(resourcesArchivePath, undefined, '-x')
  }

  configSSH(ipAddress: string): void {
    core.debug('Configuring SSH')
    const homeDirectory = process.env['HOME']

    if (homeDirectory === undefined)
      throw Error('Failed to get the home direcory')

    const sshDirectory = path.join(homeDirectory, '.ssh')

    if (!fs.existsSync(sshDirectory))
      fs.mkdirSync(sshDirectory, {recursive: true, mode: 0o700})

    const lines = [
      'StrictHostKeyChecking=accept-new',
      `Host ${ipAddress}`,
      `IdentityFile ${this.privateSshKey}`,
      'SendEnv CI GITHUB_*',
      `SendEnv ${this.input.environmentVariables}`
    ].join('\n')

    fs.appendFileSync(path.join(sshDirectory, 'config'), `${lines}\n`)
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

  private async runCommand(vm: xhyve.Vm): Promise<void> {
    core.info(`Run: ${this.input.run}`)
    const shell =
      this.input.shell === Shell.default ? '$SHELL' : toString(this.input.shell)
    await vm.execute2(
      ['sh', '-c', `'cd "${env['GITHUB_WORKSPACE']}" && exec "${shell}" -e'`],
      Buffer.from(this.input.run)
    )
  }
}

class ResourceDisk {
  readonly diskPath: string

  private readonly mountName = 'RES'
  private readonly mountPath: string

  private readonly tempPath: string
  private devicePath!: string

  constructor(tempPath: string) {
    this.mountPath = path.join('/Volumes', this.mountName)
    this.tempPath = tempPath
    this.diskPath = path.join(this.tempPath, 'res.raw')
  }

  async create(): Promise<string> {
    core.debug('Creating resource disk')
    await this.createDiskFile()
    this.devicePath = await this.createDiskDevice()
    await this.partitionDisk()

    return this.mountPath
  }

  async unmount(): Promise<void> {
    await this.unmountDisk()
    await this.detachDevice()
  }

  private async createDiskFile(): Promise<void> {
    core.debug('Creating disk file')
    await exec.exec('mkfile', ['-n', '40m', this.diskPath])
  }

  private async createDiskDevice(): Promise<string> {
    core.debug('Creating disk file')
    const devicePath = await execWithOutput(
      'hdiutil',
      [
        'attach',
        '-imagekey',
        'diskimage-class=CRawDiskImage',
        '-nomount',
        this.diskPath
      ],
      {silent: true}
    )

    return devicePath.trim()
  }

  private async partitionDisk(): Promise<void> {
    core.debug('Partitioning disk')
    await exec.exec('diskutil', [
      'partitionDisk',
      this.devicePath,
      '1',
      'GPT',
      'fat32',
      this.mountName,
      '100%'
    ])
  }

  private async unmountDisk(): Promise<void> {
    core.debug('Unmounting disk')
    await exec.exec('umount', [this.mountPath])
  }

  private async detachDevice(): Promise<void> {
    core.debug('Detaching device')
    await exec.exec('hdiutil', ['detach', this.devicePath])
  }
}

class Input {
  private run_?: string
  private operatingSystem_?: os.Kind
  private version_?: string
  private shell_?: Shell
  private environmentVariables_?: string

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
