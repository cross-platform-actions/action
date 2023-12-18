import {Vm as QemuVm} from '../../qemu_vm'

export class Vm extends QemuVm {
  protected get hardDriverFlags(): string[] {
    return this.defaultHardDriveFlags
  }

  protected override get ipv6(): string {
    return 'ipv6=off'
  }
}
