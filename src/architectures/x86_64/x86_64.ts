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

  // The CPU is passed through to the guest, so which runner a job happens to
  // get decides which features the guest sees. The features below stop some of
  // the guests from booting at all. Nothing that runs in these VMs can make
  // use of any of them, so there is nothing to weigh against turning them off.
  //
  // Advanced Matrix Extensions adds 8KB of tile registers to the area the
  // kernel saves the CPU state in. Kernels released before it existed size
  // that area from what the CPU reports, and fault as soon as userland
  // starts: NetBSD jumps to address 0 while starting init, FreeBSD panics in
  // vm_fault.
  //
  // 5-level paging (LA57), which the Intel runners from Ice Lake onwards have,
  // makes FreeBSD 13.0 panic in the trampoline that switches to it. 13.0 is
  // the only release that enables 5-level paging whenever the CPU reports it;
  // later ones leave it to the vm.pmap.la57 tunable, which defaults to off.
  //
  // STIBP always-on mode is reported by some of the AMD runners without the
  // STIBP and IBRS bits that normally come with it. DragonFly BSD writes
  // IA32_SPEC_CTRL when it sees the always-on bit, and KVM answers that write
  // with a general protection fault, since as far as it can tell the guest
  // doesn't have the MSR.
  //
  // See https://github.com/cross-platform-actions/action/issues/158.
  override get maskedCpuFeatures(): string[] {
    return [
      'amx-tile=off',
      'amx-int8=off',
      'amx-bf16=off',
      'la57=off',
      'stibp-always-on=off'
    ]
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
