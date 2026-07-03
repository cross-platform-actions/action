import {operatingSystem} from '../factory'
import versions from '../../version'
import {Qemu} from '../qemu'
import * as qemu_vm from './qemu_vm'
import {Class} from '../../utility'
import * as vm from '../../vm'

@operatingSystem
export default class NetBsd extends Qemu {
  // Both the builder repository and the image file name are built from this,
  // and the base class derives it from the class name. Without this the
  // NetBsdVax subclass would look for `netbsdvax-10.1-vax.img.zst` in a
  // `netbsdvax-builder` repository; every NetBSD image comes from the same
  // builder under the same name, whatever the architecture.
  override get name(): string {
    return 'netbsd'
  }

  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.netbsd
  }

  get vmClass(): Class<vm.Vm> {
    return qemu_vm.Vm
  }
}
