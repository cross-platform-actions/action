import {Architecture} from '../../architecture'
import * as hypervisor from '../../hypervisor'

export class X86_64 extends Architecture {
  override get name(): string {
    return 'x86-64'
  }

  override get resolveName(): string {
    return 'x86_64'
  }

  override get resourceUrl(): string {
    return `${this.resourceBaseUrl}/qemu-system-x86_64-${this.hostString}.tar`
  }

  override get cpu(): string {
    return this.hostQemu.cpu
  }

  override get machineType(): string {
    return 'q35'
  }

  override get hypervisor(): hypervisor.Hypervisor {
    return this.internalHypervisor
  }

  override get efiHypervisor(): hypervisor.Hypervisor {
    return this.internalHypervisor.efi
  }
}
