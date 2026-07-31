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

  // Advanced Matrix Extensions adds 8KB of tile registers to the area the
  // kernel saves the CPU state in. Kernels released before it existed size
  // that area from what the CPU reports, and fault as soon as userland
  // starts: NetBSD jumps to address 0 while starting init, FreeBSD panics in
  // vm_fault. The CPU is passed through to the guest, so which runner the job
  // happens to get decides whether the VM boots at all.
  //
  // Nothing that runs in these VMs can make use of AMX, so there is nothing to
  // weigh against turning it off.
  // See https://github.com/cross-platform-actions/action/issues/158.
  override get maskedCpuFeatures(): string[] {
    return ['amx-tile=off', 'amx-int8=off', 'amx-bf16=off']
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
