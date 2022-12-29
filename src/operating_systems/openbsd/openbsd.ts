import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'

import * as architecture from '../../architecture'
import * as action from '../../action/action'
import {operatingSystem} from '../factory'
import * as vmModule from '../../vm'
import {host} from '../../host'
import {QemuVm} from './qemu_vm'
import * as os from '../../operating_system'
import versions from '../../version'
import {XhyveVm} from './xhyve_vm'

@operatingSystem
export default class OpenBsd extends os.OperatingSystem {
  constructor(arch: architecture.Architecture, version: string) {
    super(arch, version)
  }

  get hypervisorUrl(): string {
    return this.architecture.hypervisor.getResourceUrl(this.architecture)
  }

  get ssHostPort(): number {
    return this.architecture.hypervisor.sshPort
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
    await os.convertToRawDisk(diskImage, targetDiskName, resourcesDirectory)
  }

  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.openbsd
  }

  createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    configuration: os.VmConfiguration
  ): vmModule.Vm {
    core.debug('Creating OpenBSD VM')

    const config: vmModule.Configuration = {
      ...configuration,

      ssHostPort: this.ssHostPort,
      firmware: path.join(
        firmwareDirectory.toString(),
        this.architecture.efiHypervisor.firmwareFile
      ),

      // qemu
      cpu: this.architecture.cpu,
      accelerator: this.architecture.accelerator,
      machineType: this.architecture.machineType,

      // xhyve
      uuid: this.uuid
    }

    const cls = host.vmModule.resolve({qemu: QemuVm, xhyve: XhyveVm})
    return new cls(
      hypervisorDirectory,
      resourcesDirectory,
      this.architecture,
      config
    )
  }
}
