import {X86} from '../x86/x86'

export class I386 extends X86 {
  override get name(): string {
    return 'i386'
  }

  override get resolveName(): string {
    return 'i386'
  }

  // Not q35: a 32-bit kernel without PAE can use only the memory below 4 GiB,
  // and `pc` puts up to 3.5 GiB there, where q35 puts at most 2.75 GiB.
  override get machineType(): string {
    return 'pc'
  }
}
