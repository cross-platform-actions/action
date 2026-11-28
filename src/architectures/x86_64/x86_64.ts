import {X86} from '../x86/x86'

export class X86_64 extends X86 {
  override get name(): string {
    return 'x86-64'
  }

  override get resolveName(): string {
    return 'x86_64'
  }

  override get machineType(): string {
    return 'q35'
  }
}
