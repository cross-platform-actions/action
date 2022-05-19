import {promises as fs} from 'fs'
import path from 'path'
import * as os from 'os'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import {Action} from './action/action'
import {Class, execWithOutput} from './utility'
import {OperatingSystem} from './operating_system'

export default abstract class ResourceDisk {
  protected readonly operatingSystem: OperatingSystem

  private readonly mountName = 'RES'
  private readonly tempPath: string
  private mountPath!: string
  private devicePath!: string

  protected constructor(action: Action) {
    this.tempPath = action.tempPath
    this.operatingSystem = action.operatingSystem
  }

  static for(action: Action): ResourceDisk {
    const implementationClass = action.host.resolve({
      macos: MacOs,
      linux: Linux
    })

    return new implementationClass(action)
  }

  get diskPath(): string {
    return path.join(this.tempPath, 'res.raw')
  }

  async create(): Promise<string> {
    core.debug('Creating resource disk')

    await this.createDiskFile('40m', this.diskPath)
    this.devicePath = await this.createDiskDevice(this.diskPath)
    await this.partitionDisk(this.devicePath, this.mountName)
    this.mountPath = await this.mountDisk(this.devicePath, this.baseMountPath)

    return this.mountPath
  }

  async unmount(): Promise<void> {
    await this.unmountDisk()
    await this.detachDevice(this.devicePath)
  }

  protected abstract createDiskFile(
    size: string,
    diskPath: string
  ): Promise<void>

  protected abstract createDiskDevice(diskPath: string): Promise<string>

  protected abstract partitionDisk(
    devicePath: string,
    mountName: string
  ): Promise<void>

  protected abstract mountDisk(
    devicePath: string,
    mountPath: string
  ): Promise<string>

  protected abstract detachDevice(devicePath: string): Promise<void>

  private get baseMountPath(): string {
    return path.join(this.tempPath, `mount/${this.mountName}`)
  }

  private async unmountDisk(): Promise<void> {
    core.debug('Unmounting disk')
    await exec.exec('sudo', ['umount', this.mountPath])
  }
}

class MacOs extends ResourceDisk {
  override async createDiskFile(size: string, diskPath: string): Promise<void> {
    await exec.exec('mkfile', ['-n', size, diskPath])
  }

  override async createDiskDevice(diskPath: string): Promise<string> {
    const devicePath = await execWithOutput(
      'hdiutil',
      [
        'attach',
        '-imagekey',
        'diskimage-class=CRawDiskImage',
        '-nomount',
        diskPath
      ],
      {silent: true}
    )

    return devicePath.trim()
  }

  override async partitionDisk(
    devicePath: string,
    mountName: string
  ): Promise<void> {
    await exec.exec('diskutil', [
      'partitionDisk',
      devicePath,
      '1',
      'GPT',
      'fat32',
      mountName,
      '100%'
    ])
  }

  override async mountDisk(
    _devicePath: string,
    mountPath: string
  ): Promise<string> {
    return path.join('/Volumes', path.basename(mountPath))
  }

  override async detachDevice(devicePath: string): Promise<void> {
    await exec.exec('hdiutil', ['detach', devicePath])
  }
}

class Linux extends ResourceDisk {
  override async createDiskFile(size: string, diskPath: string): Promise<void> {
    core.debug('Creating disk file')
    await LinuxDiskFileCreator.for(this.operatingSystem).create(size, diskPath)
  }

  override async createDiskDevice(diskPath: string): Promise<string> {
    core.debug('Creating disk device')
    return await LinuxDiskDeviceCreator.for(this.operatingSystem).create(
      diskPath
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async partitionDisk(devicePath: string, _mountName: string): Promise<void> {
    core.debug('Partitioning disk')
    await exec.exec('sudo', ['mkfs.fat', '-F32', devicePath])
  }

  async mountDisk(devicePath: string, mountPath: string): Promise<string> {
    core.debug('Mounting disk')

    await fs.mkdir(mountPath, {recursive: true})
    const uid = os.userInfo().uid
    await exec.exec('sudo', [
      'mount',
      '-o',
      `uid=${uid}`,
      devicePath,
      mountPath
    ])

    return mountPath
  }

  async detachDevice(devicePath: string): Promise<void> {
    core.debug('Detaching device')
    await exec.exec('sudo', ['losetup', '-d', devicePath])
  }
}

abstract class LinuxDiskFileCreator {
  static for(operatingSystem: OperatingSystem): LinuxDiskFileCreator {
    const implementationClass: Class<LinuxDiskFileCreator> =
      operatingSystem.resolve({
        freebsd: this.FreeBsd,
        default: this.Default
      })

    return new implementationClass()
  }

  async create(size: string, diskPath: string): Promise<void> {
    await exec.exec('truncate', ['-s', size, diskPath])
    await this.partition(diskPath)
  }

  protected abstract partition(diskPath: string): Promise<void>

  static readonly FreeBsd = class extends LinuxDiskFileCreator {
    protected override async partition(diskPath: string): Promise<void> {
      const input = Buffer.from('n\np\n1\n\n\nw\n')
      await exec.exec('fdisk', [diskPath], {input})
    }
  }

  static readonly Default = class extends LinuxDiskFileCreator {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected override async partition(_diskPath: string): Promise<void> {}
  }
}

abstract class LinuxDiskDeviceCreator {
  static for(operatingSystem: OperatingSystem): LinuxDiskDeviceCreator {
    const implementationClass: Class<LinuxDiskDeviceCreator> =
      operatingSystem.resolve({
        freebsd: this.FreeBsd,
        default: this.Default
      })

    return new implementationClass()
  }

  async create(diskPath: string): Promise<string> {
    // prettier-ignore
    const devicePath = await execWithOutput(
      'sudo',
      [
        'losetup',
        '-f',
        '--show',
        '--offset', this.offset,
        '--sizelimit', this.sizeLimit,
        diskPath
      ],
      {silent: false}
    )

    return devicePath.trim()
  }

  protected abstract get offset(): string
  protected abstract get sizeLimit(): string

  static readonly FreeBsd = class extends LinuxDiskDeviceCreator {
    // the offset and size limit are retrieved by running:
    // `sfdisk -d ${diskPath}` and multiply the start and size by 512.
    // https://checkmk.com/linux-knowledge/mounting-partition-loop-device

    protected override get offset(): string {
      return '1048576'
    }

    protected override get sizeLimit(): string {
      return '40894464'
    }
  }

  static readonly Default = class extends LinuxDiskDeviceCreator {
    protected override get offset(): string {
      return '0'
    }

    protected override get sizeLimit(): string {
      return '0'
    }
  }
}
