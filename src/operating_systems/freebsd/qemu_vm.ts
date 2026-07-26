import {Vm} from '../../qemu_vm'

export class QemuVm extends Vm {
  protected get hardDriverFlags(): string[] {
    // prettier-ignore
    return [
      '-device', 'virtio-blk-pci,drive=drive0,bootindex=0',
      '-drive', `if=none,file=${this.configuration.diskImage},id=drive0,cache=unsafe,discard=ignore,format=raw`,

      '-device', 'virtio-blk-pci,drive=drive1,bootindex=1',
      '-drive', `if=none,file=${this.configuration.resourcesDiskImage},id=drive1,cache=unsafe,discard=ignore,format=raw`,
    ]
  }
}

// On RISC-V the firmware is U-Boot, loaded via -kernel on top of QEMU's
// built-in OpenSBI. U-Boot then EFI-boots the disk image. Booting U-Boot via
// -bios instead does not reliably boot the installed disk.
export class QemuVmRiscv64 extends QemuVm {
  protected override get firmwareFlags(): string[] {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return ['-kernel', this.configuration.firmware!.toString()]
  }
}
