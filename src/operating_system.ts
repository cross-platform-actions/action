import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as architecture from './architecture'
import * as vmModule from './vm'
import {Input} from './action/input'
import {host} from './host'
import {ResourceUrls} from './operating_systems/resource_urls'
import {LinuxDiskFileCreator, LinuxDiskDeviceCreator} from './resource_disk'
import * as hypervisor from './hypervisor'

export interface ExternalVmConfiguration {
  memory: string
  cpuCount: number
}

export interface VmConfiguration extends ExternalVmConfiguration {
  cpuCount: number
  diskImage: fs.PathLike
  resourcesDiskImage: fs.PathLike
  userboot: fs.PathLike
}

export abstract class OperatingSystem {
  readonly resourcesUrl: string

  readonly architecture: architecture.Architecture

  private static readonly resourceUrls = ResourceUrls.create()
  protected readonly xhyveHypervisorUrl = `${OperatingSystem.resourceUrls.resourceBaseUrl}/xhyve-macos.tar`

  private readonly version: string

  constructor(arch: architecture.Architecture, version: string) {
    const hostString = host.toString()
    this.resourcesUrl = `${OperatingSystem.resourceUrls.resourceBaseUrl}/resources-${hostString}.tar`
    this.version = version
    this.architecture = arch
  }

  abstract get virtualMachineImageReleaseVersion(): string
  abstract get hypervisorUrl(): string
  abstract get ssHostPort(): number

  get hypervisor(): hypervisor.Hypervisor {
    return this.architecture.hypervisor
  }

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

  get linuxDiskFileCreator(): LinuxDiskFileCreator {
    return new LinuxDiskFileCreator.NoopDiskFileCreator()
  }

  get linuxDiskDeviceCreator(): LinuxDiskDeviceCreator {
    return new LinuxDiskDeviceCreator.FullDiskDeviceCreator()
  }

  get name(): string {
    return this.constructor.name.toLocaleLowerCase()
  }

  abstract createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    intput: Input,
    configuration: VmConfiguration
  ): vmModule.Vm

  async prepareDisk(
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
