import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as xhyve from './xhyve_vm'

export enum Kind {
  freeBsd,
  openBsd
}

const stringToKind: ReadonlyMap<string, Kind> = (() => {
  const map = new Map<string, Kind>()
  map.set('freebsd', Kind.freeBsd)
  map.set('openbsd', Kind.openBsd)
  return map
})()

export function toKind(value: string): Kind | undefined {
  return stringToKind.get(value.toLowerCase())
}

export enum Architecture {
  arm64,
  x86_64
}

const stringToArchitecture: ReadonlyMap<string, Architecture> = (() => {
  const map = new Map<string, Architecture>()
  map.set('arm64', Architecture.arm64)
  map.set('x86-64', Architecture.x86_64)
  return map
})()

export function toArchitecture(value: string): Architecture | undefined {
  return stringToArchitecture.get(value.toLowerCase())
}

export function toString(architecture: Architecture): string {
  for (const [key, value] of stringToArchitecture) {
    if (value === architecture) return key
  }

  throw Error(
    `Unreachable: missing Architecture.${architecture} in 'stringToArchitecture'`
  )
}

export abstract class OperatingSystem {
  private readonly baseUrl = 'https://github.com/cross-platform-actions'
  private readonly name: string
  private readonly architecture: Architecture
  private readonly version: string

  constructor(name: string, architecture: Architecture, version: string) {
    this.name = name
    this.version = version
    this.architecture = architecture
  }

  static create(
    kind: Kind,
    architecture: Architecture,
    version: string
  ): OperatingSystem {
    switch (kind) {
      case Kind.freeBsd:
        return new FreeBsd(architecture, version)
      case Kind.openBsd:
        return new OpenBsd(architecture, version)
    }
  }

  abstract get virtualMachineImageReleaseVersion(): string

  get virtualMachineImageUrl(): string {
    return [
      this.baseUrl,
      `${this.name}-builder`,
      'releases',
      'download',
      this.virtualMachineImageReleaseVersion,
      this.imageName
    ].join('/')
  }

  abstract createVirtualMachine(
    xhyvePath: fs.PathLike,
    options: xhyve.Options
  ): xhyve.Vm

  async prepareDisk(
    /* eslint-disable @typescript-eslint/no-unused-vars */
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
    /* eslint-enable */
  ): Promise<void> {
    throw Error('Not implemented')
  }

  private get imageName(): string {
    const encodedVersion = encodeURIComponent(this.version)
    const archString = toString(this.architecture)
    return `${this.name}-${encodedVersion}-${archString}.qcow2`
  }
}

class FreeBsd extends OperatingSystem {
  constructor(architecture: Architecture, version: string) {
    super('freebsd', architecture, version)
  }

  async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    await convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  get virtualMachineImageReleaseVersion(): string {
    return 'v0.0.1'
  }

  createVirtualMachine(
    xhyvePath: fs.PathLike,
    options: xhyve.Options
  ): xhyve.Vm {
    core.debug('Creating FreeBSD VM')
    return new xhyve.FreeBsd(xhyvePath, options)
  }
}

class OpenBsd extends OperatingSystem {
  constructor(architecture: Architecture, version: string) {
    super('openbsd', architecture, version)
  }

  async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    await convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  get virtualMachineImageReleaseVersion(): string {
    return 'v0.2.0'
  }

  createVirtualMachine(
    xhyvePath: fs.PathLike,
    options: xhyve.Options
  ): xhyve.Vm {
    core.debug('Creating OpenBSD VM')
    return new xhyve.OpenBsd(xhyvePath, options)
  }
}

async function convertToRawDisk(
  diskImage: fs.PathLike,
  targetDiskName: fs.PathLike,
  resourcesDirectory: fs.PathLike
): Promise<void> {
  core.debug('Converting qcow2 image to raw')
  const resDir = resourcesDirectory.toString()
  await exec.exec(path.join(resDir, 'qemu-img'), [
    'convert',
    '-f',
    'qcow2',
    '-O',
    'raw',
    diskImage.toString(),
    path.join(resDir, targetDiskName.toString())
  ])
}
