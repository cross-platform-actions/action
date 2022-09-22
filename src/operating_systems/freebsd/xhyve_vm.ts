import {Vm} from '../../xhyve_vm'

export class XhyveVm extends Vm {
  override get command(): string[] {
    // prettier-ignore
    return super.command.concat(
      '-f', `fbsd,${this.configuration.userboot},${this.configuration.diskImage},`
    )
  }

  protected override async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -p now')
  }

  protected get networkDevice(): string {
    return 'virtio-net'
  }
}
