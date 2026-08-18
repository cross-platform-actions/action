import {operatingSystem} from '../factory'
import versions from '../../version'
import {Qemu} from '../qemu'
import * as qemu_vm from './qemu_vm'
import {Class} from '../../utility'
import * as vm from '../../vm'
import {Input} from '../../action/input'
import {Variant} from '../../action/variant'

@operatingSystem
export default class NetBsd extends Qemu {
  // The builder repository and the image file name are both built from this,
  // and the base class derives it from the class name -- so without this the
  // NetBsdVax subclass would look in a `netbsdvax-builder` repository.
  override get name(): string {
    return 'netbsd'
  }

  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.netbsd
  }

  get vmClass(): Class<vm.Vm> {
    return qemu_vm.Vm
  }

  // Booting on `microvm` changes the hardware the guest sees -- the root disk
  // arrives as `ld0` rather than `sd0`, there is no PCI bus and no ACPI, and
  // `uname -v` names a different kernel -- so it is something a job opts into,
  // not something a NetBSD version quietly starts doing.
  override get supportedVariants(): Variant[] {
    return [Variant.default, Variant.microvm]
  }

  protected override vmClassFor(
    input: Input,
    configuration: vm.Configuration
  ): Class<vm.Vm> {
    if (input.variant !== Variant.microvm)
      return super.vmClassFor(input, configuration)

    qemu_vm.MicrovmVm.validate(configuration)

    return qemu_vm.MicrovmVm
  }

  // Every NetBSD image is distributed as a bundle rather than as qcow2: qcow2's
  // own compression has to keep the image writable, so it compresses worse than
  // a solid stream does, and a job pays that difference on every run, the
  // download being most of what is left of its setup time. See
  // https://github.com/cross-platform-actions/action/issues/151. The bundle also
  // carries the kernel for the platforms that can boot one directly, which is
  // why it's a tar and not just a compressed image.
  protected override get imageFileExtension(): string {
    return NetBsd.bundleFileExtension
  }

  // The images accept an SSH login with no credential at all, so there's no key
  // to deliver and no resources disk to carry it on. VAX never could mount that
  // disk, which is where the passwordless login came from; every architecture
  // does it that way now.
  override get requiresSshKey(): boolean {
    return false
  }
}
