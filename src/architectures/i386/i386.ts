import {X86} from '../x86/x86'

export class I386 extends X86 {
  override get name(): string {
    return 'i386'
  }
}
