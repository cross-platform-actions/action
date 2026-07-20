import {X86_64} from './x86_64'

export class X86_64OpenBsd extends X86_64 {
  override get networkDevice(): string {
    return 'e1000'
  }
}
