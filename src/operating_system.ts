import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as architecture from './architecture'
import * as vmModule from './vm'
import * as action from './action/action'
import {host} from './host'
import {Class, getImplementation} from './utility'
import {ResourceUrls} from './operating_systems/resource_urls'

export interface VmConfiguration {
  memory: string
  cpuCount: number
  diskImage: fs.PathLike

  resourcesDiskImage: fs.PathLike
  userboot: fs.PathLike
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
    configuration: VmConfiguration
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

  protected get uuid(): string {
    return '864ED7F0-7876-4AA7-8511-816FABCFA87F'
  }

  private get imageName(): string {
    const encodedVersion = encodeURIComponent(this.version)
    return `${this.name}-${encodedVersion}-${this.architecture.name}.qcow2`
  }
}

export async function convertToRawDisk(
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
