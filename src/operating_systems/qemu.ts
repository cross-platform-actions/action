import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'

import * as vmModule from '../vm'
import * as os from '../operating_system'
import {Input} from '../action/input'
import {Class} from '../utility'

import {
  Hypervisor,
  Qemu as QemuHypervisor,
  QemuEfi as QemuEfiHypervisor
} from '../hypervisor'

export abstract class Qemu extends os.OperatingSystem {
  abstract get vmClass(): Class<vmModule.Vm>

  // Which of them to instantiate, for a platform that has more than one
  // variant to pick between.
  protected vmClassFor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _input: Input,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _configuration: vmModule.Configuration
  ): Class<vmModule.Vm> {
    return this.vmClass
  }

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
      microvmFirmware: path.join(
        firmwareDirectory.toString(),
        this.hypervisor.microvmFirmwareFile
      ),

      cpu: this.architecture.cpu,
      machineType: this.architecture.machineType,
      kernel: path.join(
        resourcesDirectory.toString(),
        os.OperatingSystem.kernelName
      )
    }

    const vmClass = this.vmClassFor(input, config)

    return new vmClass(
      hypervisorDirectory,
      resourcesDirectory,
      this.architecture,
      input,
      config
    )
  }
}
