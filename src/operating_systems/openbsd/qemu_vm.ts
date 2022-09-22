import {Vm} from '../../qemu_vm'

export class QemuVm extends Vm {
  protected get hardDriverFlags(): string[] {
    return this.defaultHardDriveFlags
  }

  protected override get netDevive(): string {
    return this.architecture.networkDevice
  }

  protected override async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -h -p now')
  }
}
