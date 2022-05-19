import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as architecture from './architecture'
import * as xhyve from './xhyve_vm'
import * as qemu from './qemu_vm'
import * as vmModule from './vm'
import * as action from './action/action'
import * as host from './host'
import {Class} from './utility'
import {ResourceUrls} from './operating_systems/resource_urls'

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
  protected static readonly qemuFirmwareDirectory = 'share/qemu'

  readonly name: string

  readonly resourcesUrl: string

  readonly architecture: architecture.Architecture

  private static readonly resourceUrls = ResourceUrls.create()
  protected readonly xhyveHypervisorUrl = `${OperatingSystem.resourceUrls.resourceBaseUrl}v0.3.1/xhyve-macos.tar`

  private readonly version: string

  protected readonly xhyveEfiFirmware = 'uefi.fd'
  protected readonly qemuEfiFirmware = `${OperatingSystem.qemuFirmwareDirectory}/OVMF.fd`
  protected readonly qemuBiosFirmware = `${OperatingSystem.qemuFirmwareDirectory}/bios-256k.bin`

  constructor(name: string, arch: architecture.Architecture, version: string) {
    const hostString = host.toString(host.kind)
    this.resourcesUrl = `${OperatingSystem.resourceUrls.resourceBaseUrl}v0.3.1/resources-${hostString}.tar`
    this.name = name
    this.version = version
    this.architecture = arch
  }

  static create(
    operatingSystemKind: Kind,
    architectureKind: architecture.Kind,
    version: string
  ): OperatingSystem {
    const arch = architecture.getArchitecture(architectureKind)

    switch (operatingSystemKind) {
      case Kind.freeBsd:
        return new FreeBsd(arch, version)
      case Kind.netBsd:
        return new NetBsd(arch, version)
      case Kind.openBsd:
        return new OpenBsd(arch, version)
    }
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

  resolve<
    Default extends Base,
    FreeBsd extends Base,
    OpenBsd extends Base,
    NetBsd extends Base,
    Base
  >(
    implementation: Implementation<Default, FreeBsd, OpenBsd, NetBsd, Base>
  ): Class<Base> {
    return this.resolveImplementation(implementation) ?? implementation.default
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

  protected abstract resolveImplementation<
    Default extends Base,
    FreeBsd extends Base,
    OpenBsd extends Base,
    NetBsd extends Base,
    Base
  >(
    implementation: Implementation<Default, FreeBsd, OpenBsd, NetBsd, Base>
  ): Class<Base> | undefined

  private get imageName(): string {
    const encodedVersion = encodeURIComponent(this.version)
    const archString = architecture.toString(this.architecture.kind)
    return `${this.name}-${encodedVersion}-${archString}.qcow2`
  }
}

interface Implementation<
  Default extends Base,
  FreeBsd extends Base,
  OpenBsd extends Base,
  NetBsd extends Base,
  Base
> {
  default: Class<Default>
  freebsd?: Class<FreeBsd>
  openbsd?: Class<OpenBsd>
  netbsd?: Class<NetBsd>
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
    if (host.host.canRunXhyve(this.architecture)) return this.xhyveHypervisorUrl
    else return this.architecture.resourceUrl
  }

  get ssHostPort(): number {
    if (host.host.canRunXhyve(this.architecture)) return xhyve.Vm.sshPort
    else return qemu.Vm.sshPort
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
    return 'v0.2.0'
  }

  createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    configuration: vmModule.Configuration
  ): vmModule.Vm {
    core.debug('Creating FreeBSD VM')

    if (this.architecture.kind === architecture.Kind.x86_64) {
      const firmwareFile = host.host.canRunXhyve(this.architecture)
        ? this.xhyveEfiFirmware
        : this.qemuBiosFirmware

      configuration.firmware = path.join(
        firmwareDirectory.toString(),
        firmwareFile
      )

      return new host.host.vmModule.FreeBsd(
        hypervisorDirectory,
        resourcesDirectory,
        configuration
      )
    } else {
      throw Error(
        `Not implemented: FreeBSD guests are not implemented on ${architecture.toString(
          this.architecture.kind
        )}`
      )
    }
  }

  protected override resolveImplementation<
    Default extends Base,
    FreeBsd extends Base,
    OpenBsd extends Base,
    NetBsd extends Base,
    Base
  >(
    implementation: Implementation<Default, FreeBsd, OpenBsd, NetBsd, Base>
  ): Class<Base> | undefined {
    return implementation.freebsd
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
    return 'v0.0.1'
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
        this.qemuBiosFirmware
      )

      return new qemu.NetBsd(
        hypervisorDirectory,
        resourcesDirectory,
        configuration
      )
    } else {
      throw Error(
        `Not implemented: NetBSD guests are not implemented on ${architecture.toString(
          this.architecture.kind
        )}`
      )
    }
  }

  protected override resolveImplementation<
    Default extends Base,
    FreeBsd extends Base,
    OpenBsd extends Base,
    NetBsd extends Base,
    Base
  >(
    implementation: Implementation<Default, FreeBsd, OpenBsd, NetBsd, Base>
  ): Class<Base> | undefined {
    return implementation.netbsd
  }
}

class OpenBsd extends OperatingSystem {
  constructor(arch: architecture.Architecture, version: string) {
    super('openbsd', arch, version)
  }

  get hypervisorUrl(): string {
    if (host.host.canRunXhyve(this.architecture)) return this.xhyveHypervisorUrl
    else return this.architecture.resourceUrl
  }

  get ssHostPort(): number {
    if (host.host.canRunXhyve(this.architecture)) return xhyve.Vm.sshPort
    else return qemu.Vm.sshPort
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
    return 'v0.2.0'
  }

  createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    configuration: vmModule.Configuration
  ): vmModule.Vm {
    core.debug('Creating OpenBSD VM')

    if (this.architecture.kind === architecture.Kind.x86_64) {
      const firmwareFile = host.host.canRunXhyve(this.architecture)
        ? this.xhyveEfiFirmware
        : this.qemuEfiFirmware

      configuration.firmware = path.join(
        firmwareDirectory.toString(),
        firmwareFile
      )

      return new host.host.vmModule.OpenBsd(
        hypervisorDirectory,
        resourcesDirectory,
        configuration
      )
    } else {
      throw Error(
        `Not implemented: OpenBSD guests are not implemented on ${architecture.toString(
          this.architecture.kind
        )}`
      )
    }
  }

  protected override resolveImplementation<
    Default extends Base,
    FreeBsd extends Base,
    OpenBsd extends Base,
    NetBsd extends Base,
    Base
  >(
    implementation: Implementation<Default, FreeBsd, OpenBsd, NetBsd, Base>
  ): Class<Base> | undefined {
    return implementation.openbsd
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
