import {Vm as QemuVm} from '../../qemu_vm'

export class Vm extends QemuVm {
  protected get hardDriverFlags(): string[] {
    // prettier-ignore
    return [
      '-device', 'virtio-blk-pci,drive=drive0,bootindex=0',
      '-drive', `if=none,file=${this.configuration.diskImage},id=drive0,cache=unsafe,discard=ignore,format=raw`,

      '-device', 'virtio-blk-pci,drive=drive1,bootindex=1',
      '-drive', `if=none,file=${this.configuration.resourcesDiskImage},id=drive1,cache=unsafe,discard=ignore,format=raw`,
    ]
  }

  protected override get ipv6(): string {
    return 'ipv6=off'
  }
}
