import {Vm} from '../../xhyve_vm'

export class XhyveVm extends Vm {
  override get command(): string[] {
    // prettier-ignore
    return super.command.concat(
      '-f', `fbsd,${this.configuration.userboot},${this.configuration.diskImage},`
    )
  }

  protected get networkDevice(): string {
    return 'virtio-net'
  }
}
