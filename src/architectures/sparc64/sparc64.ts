import {Architecture} from '../../architecture'
import * as hypervisor from '../../hypervisor'

export class Sparc64 extends Architecture {
  override get name(): string {
    return 'sparc64'
  }

  override get resolveName(): string {
    return 'sparc64'
  }

  override get resourceUrl(): string {
    return `${this.resourceBaseUrl}/qemu-system-sparc64-${this.hostString}.tar`
  }

  override get cpu(): string {
    return 'TI-UltraSparc-IIi'
  }

  override get machineType(): string {
    return 'sun4u'
  }

  override get networkDevice(): string {
    return 'sunhme'
  }

  override get hypervisor(): hypervisor.Hypervisor {
    return new hypervisor.QemuSparc64()
  }

  override get efiHypervisor(): hypervisor.Hypervisor {
    return new hypervisor.QemuSparc64()
  }
}
