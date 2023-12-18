import {Vm} from '../../xhyve_vm'

export class XhyveVm extends Vm {
  override get command(): string[] {
    // prettier-ignore
    return super.command.concat(
      '-l', `bootrom,${this.configuration.firmware}`,
      '-w'
    )
  }

  protected get networkDevice(): string {
    return 'e1000'
  }
}
