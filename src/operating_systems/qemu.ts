import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'

import * as vmModule from '../vm'
import * as os from '../operating_system'
import {Input} from '../action/input'
import {Class} from '../utility'
import {Vm as QemuVm} from '../qemu_vm'

import {
  Hypervisor,
  Qemu as QemuHypervisor,
  QemuEfi as QemuEfiHypervisor
} from '../hypervisor'

export abstract class Qemu extends os.OperatingSystem {
  abstract get vmClass(): Class<QemuVm>

  get hypervisorUrl(): string {
    return this.architecture.resourceUrl
  }

  override get hypervisor(): Hypervisor {
    const cls = this.architecture.resolve({
      arm64: QemuEfiHypervisor,
      x86_64: QemuHypervisor
    })

    return new cls()
  }

  get ssHostPort(): number {
    return 2847
  }

  createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    input: Input,
    configuration: os.VmConfiguration
  ): vmModule.Vm {
    core.debug(`Creating ${this.name} VM`)

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

    return new this.vmClass(
      hypervisorDirectory,
      resourcesDirectory,
      this.architecture,
      input,
      config
    )
  }
}
