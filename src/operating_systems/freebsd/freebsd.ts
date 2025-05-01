import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'

import {operatingSystem} from '../factory'
import * as vmModule from '../../vm'
import {QemuVm} from './qemu_vm'
import * as os from '../../operating_system'
import {LinuxDiskFileCreator, LinuxDiskDeviceCreator} from '../../resource_disk'
import versions from '../../version'
import {XhyveVm} from './xhyve_vm'
import {Input} from '../../action/input'

@operatingSystem
export default class FreeBsd extends os.OperatingSystem {
  get hypervisorUrl(): string {
    return this.hypervisor.getResourceUrl(this.architecture)
  }

  get ssHostPort(): number {
    return this.hypervisor.sshPort
  }

  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.freebsd
  }

  override get linuxDiskFileCreator(): LinuxDiskFileCreator {
    return new LinuxDiskFileCreator.FdiskDiskFileCreator()
  }

  override get linuxDiskDeviceCreator(): LinuxDiskDeviceCreator {
    return new LinuxDiskDeviceCreator.FdiskDiskDeviceCreator()
  }

  createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    input: Input,
    configuration: os.VmConfiguration
  ): vmModule.Vm {
    core.debug('Creating FreeBSD VM')

    const config: vmModule.Configuration = {
      ...configuration,

      ssHostPort: this.ssHostPort,
      firmware: path.join(
        firmwareDirectory.toString(),
        this.architecture.hypervisor.firmwareFile
      ),

      // qemu
      cpu: this.architecture.cpu,
      machineType: this.architecture.machineType,

      // xhyve
      uuid: this.uuid
    }

    const cls = this.hypervisor.resolve({qemu: QemuVm, xhyve: XhyveVm})
    return new cls(
      hypervisorDirectory,
      resourcesDirectory,
      this.architecture,
      input,
      config
    )
  }
}
