import {promises as fs} from 'fs'
import * as process from 'process'
import * as os from 'os'

import * as exec from '@actions/exec'

import * as architecture from './architecture'
import * as qemu from './qemu_vm'
import {execWithOutput} from './utility'
import path from 'path'
import * as xhyve from './xhyve_vm'

export enum Kind {
  darwin,
  linux
}

export const kind = toKind(process.platform)

function toKind(value: string): Kind {
  switch (value) {
    case 'darwin':
      return Kind.darwin
    case 'linux':
      return Kind.linux
    default:
      throw Error(`Unhandled host platform: ${value}`)
  }
}

export function toString(value: Kind): string {
  switch (value) {
    case Kind.darwin:
      return 'macos'
    case Kind.linux:
      return 'linux'
    default:
      throw Error(`Unhandled host platform: ${value}`)
  }
}

export abstract class Host {
  static create(): Host {
    switch (kind) {
      case Kind.darwin:
        return new MacOs()
      case Kind.linux:
        return new Linux()
      default:
        throw Error(`Unhandled host platform: ${kind}`)
    }
  }

  abstract get workDirectory(): string
  abstract get vmModule(): typeof xhyve | typeof qemu
  abstract canRunXhyve(arch: architecture.Architecture): boolean
  abstract createDiskFile(size: string, diskPath: string): Promise<void>
  abstract createDiskDevice(diskPath: string): Promise<string>
  abstract partitionDisk(devicePath: string, mountName: string): Promise<void>
  abstract mountDisk(devicePath: string, mountPath: string): Promise<string>
  abstract detachDevice(devicePath: string): Promise<void>
}

class MacOs extends Host {
  get workDirectory(): string {
    return '/Users/runner/work'
  }

  get vmModule(): typeof xhyve | typeof qemu {
    return xhyve
  }

  canRunXhyve(arch: architecture.Architecture): boolean {
    return arch.kind === architecture.Kind.x86_64
  }

  async createDiskFile(size: string, diskPath: string): Promise<void> {
    await exec.exec('mkfile', ['-n', size, diskPath])
  }

  async createDiskDevice(diskPath: string): Promise<string> {
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

  async partitionDisk(devicePath: string, mountName: string): Promise<void> {
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

  async mountDisk(_devicePath: string, mountPath: string): Promise<string> {
    return path.join('/Volumes', path.basename(mountPath))
  }

  async detachDevice(devicePath: string): Promise<void> {
    await exec.exec('hdiutil', ['detach', devicePath])
  }
}

class Linux extends Host {
  get workDirectory(): string {
    return '/home/runner/work'
  }

  get vmModule(): typeof xhyve | typeof qemu {
    return qemu
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  canRunXhyve(_arch: architecture.Architecture): boolean {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return false
  }

  async createDiskFile(size: string, diskPath: string): Promise<void> {
    await exec.exec('truncate', ['-s', size, diskPath])

    const input = Buffer.from('n\np\n1\n\n\nw\n')
    // technically, this is partitioning the disk
    await exec.exec('fdisk', [diskPath], {input})
  }

  async createDiskDevice(diskPath: string): Promise<string> {
    // the offset and size limit are retrieved by running:
    // `sfdisk -d ${diskPath}` and multiply the start and size by 512.
    // https://checkmk.com/linux-knowledge/mounting-partition-loop-device

    // prettier-ignore
    const devicePath = await execWithOutput(
      'sudo',
      [
        'losetup',
        '-f',
        '--show',
        '--offset', '1048576',
        '--sizelimit', '40894464',
        diskPath
      ],
      {silent: true}
    )

    return devicePath.trim()
  }

  /* eslint-disable  @typescript-eslint/no-unused-vars */
  async partitionDisk(devicePath: string, _mountName: string): Promise<void> {
    /* eslint-enable  @typescript-eslint/no-unused-vars */
    // technically, this is creating the filesystem on the partition
    await exec.exec('sudo', ['mkfs.fat', '-F32', devicePath])
  }

  async mountDisk(devicePath: string, mountPath: string): Promise<string> {
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
    await exec.exec('sudo', ['losetup', '-d', devicePath])
  }
}

export const host = Host.create()
