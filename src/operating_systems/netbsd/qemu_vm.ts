import {Vm as QemuVm} from '../../qemu_vm'

export class Vm extends QemuVm {
  protected get hardDriverFlags(): string[] {
    return this.defaultHardDriveFlags
  }

  protected override get ipv6(): string {
    return 'ipv6=off'
  }
}

// On RISC-V the firmware is U-Boot, loaded via -kernel on top of QEMU's
// built-in OpenSBI. U-Boot then EFI-boots the disk image. Booting U-Boot via
// -bios instead does not reliably boot the installed disk. The RISC-V kernel
// only attaches virtio devices through the MMIO transport, it leaves the ones
// on the PCI bus unconfigured.
export class VmRiscv64 extends Vm {
  protected override get hardDriverFlags(): string[] {
    // prettier-ignore
    return [
      '-device', 'virtio-blk-device,drive=drive0',
      '-drive', `if=none,file=${this.configuration.diskImage},id=drive0,cache=unsafe,discard=ignore,format=raw`,

      '-device', 'virtio-blk-device,drive=drive1',
      '-drive', `if=none,file=${this.configuration.resourcesDiskImage},id=drive1,cache=unsafe,discard=ignore,format=raw`,
    ]
  }

  protected override get netDeviceFlags(): string[] {
    // An MMIO device has no PCI address.
    return ['-device', 'virtio-net-device,netdev=user.0']
  }

  protected override get firmwareFlags(): string[] {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return ['-kernel', this.configuration.firmware!.toString()]
  }
}
