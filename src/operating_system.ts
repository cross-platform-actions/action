import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as architecture from './architecture'
import * as qemu from './qemu_vm'
import * as vmModule from './vm'
import * as action from './action/action'
import {host} from './host'
import {Class, getImplementation, getOrThrow} from './utility'
import {ResourceUrls} from './operating_systems/resource_urls'
import versions from './version'

export enum Kind {
  freeBsd,
  netBsd,
  openBsd
}

const stringToKind: ReadonlyMap<string, Kind> = (() => {
  const map = new Map<string, Kind>()
  map.set('freebsd', Kind.freeBsd)
  map.set('netbsd', Kind.netBsd)
  map.set('openbsd', Kind.openBsd)
  return map
})()

export function toKind(value: string): Kind | undefined {
  return stringToKind.get(value.toLowerCase())
}

export abstract class OperatingSystem {
  readonly name: string

  readonly resourcesUrl: string

  readonly architecture: architecture.Architecture

  private static readonly resourceUrls = ResourceUrls.create()
  protected readonly xhyveHypervisorUrl = `${OperatingSystem.resourceUrls.resourceBaseUrl}/xhyve-macos.tar`

  private readonly version: string

  constructor(name: string, arch: architecture.Architecture, version: string) {
    const hostString = host.toString()
    this.resourcesUrl = `${OperatingSystem.resourceUrls.resourceBaseUrl}/resources-${hostString}.tar`
    this.name = name
    this.version = version
    this.architecture = arch
  }

  static create(
    operatingSystemKind: Kind,
    arch: architecture.Architecture,
    version: string
  ): OperatingSystem {
    const cls = getOrThrow(this.operatingSystemMap, operatingSystemKind)
    return new cls(arch, version)
  }

  private static get operatingSystemMap(): ReadonlyMap<Kind, typeof FreeBsd> {
    return new Map([
      [Kind.freeBsd, FreeBsd],
      [Kind.netBsd, NetBsd],
      [Kind.openBsd, OpenBsd]
    ])
  }

  abstract get virtualMachineImageReleaseVersion(): string
  abstract get hypervisorUrl(): string
  abstract get ssHostPort(): number
  abstract get actionImplementationKind(): action.ImplementationKind

  get virtualMachineImageUrl(): string {
    return [
      OperatingSystem.resourceUrls.baseUrl,
      `${this.name}-builder`,
      'releases',
      'download',
      this.virtualMachineImageReleaseVersion,
      this.imageName
    ].join('/')
  }

  resolve<Base>(implementation: Record<string, Class<Base>>): Class<Base> {
    return getImplementation(this, implementation)
  }

  abstract createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    configuration: vmModule.Configuration
  ): vmModule.Vm

  abstract prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void>

  async setupWorkDirectory(
    vm: vmModule.Vm,
    workDirectory: string
  ): Promise<void> {
    const destination = `/home/${vmModule.Vm.user}/work`

    await vm.execute('mkdir -p /home/runner/work')

    if (workDirectory === destination)
      await vm.execute(`rm -rf '${destination}' && mkdir -p '${workDirectory}'`)
    else {
      await vm.execute(
        `rm -rf '${destination}' && mkdir -p '${workDirectory}' && ln -sf '${workDirectory}/' '${destination}'`
      )
    }
  }

  private get imageName(): string {
    const encodedVersion = encodeURIComponent(this.version)
    return `${this.name}-${encodedVersion}-${this.architecture.name}.qcow2`
  }
}

abstract class Qemu extends OperatingSystem {
  get ssHostPort(): number {
    return 2847
  }
}

class FreeBsd extends OperatingSystem {
  constructor(arch: architecture.Architecture, version: string) {
    super('freebsd', arch, version)
  }

  get hypervisorUrl(): string {
    return host.hypervisor.getResourceUrl(this.architecture)
  }

  get ssHostPort(): number {
    return this.architecture.hypervisor.sshPort
  }

  get actionImplementationKind(): action.ImplementationKind {
    return this.architecture.resolve({
      x86_64: action.ImplementationKind.xhyve,
      default: action.ImplementationKind.qemu
    })
  }

  override async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    await convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.freebsd
  }

  createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    configuration: vmModule.Configuration
  ): vmModule.Vm {
    core.debug('Creating FreeBSD VM')

    if (this.architecture.kind === architecture.Kind.x86_64) {
      configuration.firmware = path.join(
        firmwareDirectory.toString(),
        host.hypervisor.firmwareFile
      )

      return new host.vmModule.FreeBsd(
        hypervisorDirectory,
        resourcesDirectory,
        configuration
      )
    } else {
      throw Error(
        `Not implemented: FreeBSD guests are not implemented on ${this.architecture.name}`
      )
    }
  }
}

class NetBsd extends Qemu {
  constructor(arch: architecture.Architecture, version: string) {
    super('netbsd', arch, version)
  }

  get hypervisorUrl(): string {
    return this.architecture.resourceUrl
  }

  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.netbsd
  }

  get actionImplementationKind(): action.ImplementationKind {
    return action.ImplementationKind.qemu
  }

  override async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    await convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    configuration: vmModule.Configuration
  ): vmModule.Vm {
    core.debug('Creating NetBSD VM')

    if (this.architecture.kind === architecture.Kind.x86_64) {
      configuration.firmware = path.join(
        firmwareDirectory.toString(),
        host.hypervisor.firmwareFile
      )

      return new qemu.NetBsd(
        hypervisorDirectory,
        resourcesDirectory,
        configuration
      )
    } else {
      throw Error(
        `Not implemented: NetBSD guests are not implemented on ${this.architecture.name}`
      )
    }
  }
}

class OpenBsd extends OperatingSystem {
  constructor(arch: architecture.Architecture, version: string) {
    super('openbsd', arch, version)
  }

  get hypervisorUrl(): string {
    return host.hypervisor.getResourceUrl(this.architecture)
  }

  get ssHostPort(): number {
    return host.hypervisor.sshPort
  }

  get actionImplementationKind(): action.ImplementationKind {
    if (this.architecture.kind === architecture.Kind.x86_64)
      return action.ImplementationKind.xhyve
    else return action.ImplementationKind.qemu
  }

  override async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    await convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.openbsd
  }

  createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    configuration: vmModule.Configuration
  ): vmModule.Vm {
    core.debug('Creating OpenBSD VM')

    configuration.firmware = path.join(
      firmwareDirectory.toString(),
      host.efiHypervisor.firmwareFile
    )

    return new host.vmModule.OpenBsd(
      hypervisorDirectory,
      resourcesDirectory,
      configuration
    )
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
