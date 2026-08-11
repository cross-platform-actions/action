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
    return this.architecture.resolve({
      riscv64: qemu_vm.VmRiscv64,
      default: qemu_vm.Vm
    })
  }

  // The FAT resources disk that carries the generated SSH key can be attached
  // on riscv64, but the image cannot find it: its rc.local takes the last entry
  // of `hw.disknames`, and the RISC-V disks enumerate as `ld4` and `ld5` with
  // the boot disk's wedges `dk0` and `dk1` registered after both of them, so
  // the last entry is the root wedge rather than the resources disk. That image
  // gives its user an empty password instead, which needs nothing from this
  // end: sshd's keyboard-interactive method accepts it without a prompt.
  override get requiresSshKey(): boolean {
    return this.architecture.resolve({riscv64: false, default: true})
  }
}
