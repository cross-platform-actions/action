import {Architecture} from '../../architecture'
import * as hypervisor from '../../hypervisor'

export class Riscv64 extends Architecture {
  override get name(): string {
    return 'riscv64'
  }

  override get resolveName(): string {
    return 'riscv64'
  }

  override get resourceUrl(): string {
    return `${this.resourceBaseUrl}/qemu-system-riscv64-${this.hostString}.tar`
  }

  override get cpu(): string {
    return 'rv64'
  }

  override get machineType(): string {
    return 'virt'
  }

  override get hypervisor(): hypervisor.Hypervisor {
    return new hypervisor.QemuRiscv()
  }

  override get efiHypervisor(): hypervisor.Hypervisor {
    return new hypervisor.QemuRiscv()
  }
}
