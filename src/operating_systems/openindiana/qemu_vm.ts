import {Vm as QemuVm} from '../../qemu_vm'

export class Vm extends QemuVm {
  protected get hardDriverFlags(): string[] {
    // prettier-ignore
    return [
      '-device', 'virtio-blk,drive=drive0,bootindex=0,addr=0x02',
      '-drive', `if=none,file=${this.configuration.diskImage},id=drive0,cache=unsafe,discard=ignore,format=raw`,
    ]
  }
}
