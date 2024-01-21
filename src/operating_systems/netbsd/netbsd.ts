import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'

import * as architecture from '../../architecture'
import {operatingSystem} from '../factory'
import * as vmModule from '../../vm'
import * as os from '../../operating_system'
import versions from '../../version'
import {Qemu} from '../qemu'
import * as qemu_vm from './qemu_vm'
import {Input} from '../../action/input'

@operatingSystem
export default class NetBsd extends Qemu {
  constructor(arch: architecture.Architecture, version: string) {
    super(arch, version)
  }

  get hypervisorUrl(): string {
    return this.architecture.resourceUrl
  }

  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.netbsd
  }

  override async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    await os.convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    input: Input,
    configuration: os.VmConfiguration
  ): vmModule.Vm {
    core.debug('Creating NetBSD VM')

    const config: vmModule.Configuration = {
      ...configuration,

      ssHostPort: this.ssHostPort,
      firmware: path.join(
        firmwareDirectory.toString(),
        this.hypervisor.firmwareFile
      ),

      // qemu
      cpu: this.architecture.cpu,
      machineType: this.architecture.machineType,

      // xhyve
      uuid: this.uuid
    }

    return new qemu_vm.Vm(
      hypervisorDirectory,
      resourcesDirectory,
      this.architecture,
      input,
      config
    )
  }
}
