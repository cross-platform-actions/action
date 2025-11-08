import {operatingSystem} from '../factory'
import versions from '../../version'
import {Qemu} from '../qemu'
import * as qemu_vm from './qemu_vm'
import {Class} from '../../utility'
import {Vm as QemuVm} from '../../qemu_vm'

@operatingSystem
export default class OmniOs extends Qemu {
  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.omnios
  }

  get vmClass(): Class<QemuVm> {
    return qemu_vm.Vm
  }
}
