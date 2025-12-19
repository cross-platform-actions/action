import {Architecture} from '../../architecture'
import * as hypervisor from '../../hypervisor'

export class Arm64 extends Architecture {
  override get name(): string {
    return 'arm64'
  }

  override get resolveName(): string {
    return 'arm64'
  }

  override get resourceUrl(): string {
    return `${this.resourceBaseUrl}/qemu-system-aarch64-${this.hostString}.tar`
  }

  override get cpu(): string {
    return 'cortex-a57'
  }

  override get machineType(): string {
    return 'virt'
  }

  override get hypervisor(): hypervisor.Hypervisor {
    return this.host.efiHypervisor
  }

  override get efiHypervisor(): hypervisor.Hypervisor {
    return new hypervisor.QemuEfi()
  }

  override validateHypervisor(kind: hypervisor.Kind): void {
    switch (kind) {
      case hypervisor.Kind.qemu:
        break
      case hypervisor.Kind.xhyve:
        throw new Error('Unsupported hypervisor for architecture ARM64: xhyve')
      default:
        throw new Error(`Internal Error: Unhandled hypervisor kind: ${kind}`)
    }
  }
}
