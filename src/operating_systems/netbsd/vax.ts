import NetBsd from './netbsd'
import * as vax_vm from './vax_vm'
import {Class} from '../../utility'
import * as vm from '../../vm'
import {Hypervisor, Simh as SimhHypervisor} from '../../hypervisor'
import {Variant} from '../../action/variant'

// NetBSD on the VAX architecture. Unlike the other architectures it runs on
// the SIMH simulator instead of QEMU, which drives every difference below.
export default class NetBsdVax extends NetBsd {
  override get vmClass(): Class<vm.Vm> {
    return vax_vm.Vm
  }

  // `microvm` is a QEMU machine type, and this runs on SIMH, so the variant
  // NetBsd offers isn't available here.
  override get supportedVariants(): Variant[] {
    return [Variant.default]
  }

  protected override vmClassFor(): Class<vm.Vm> {
    return this.vmClass
  }

  override get hypervisor(): Hypervisor {
    return new SimhHypervisor()
  }

  // The emulated VAX boots much slower than the QEMU based VMs: booting to a
  // reachable sshd takes roughly 15 minutes even though the image ships with
  // pre-generated SSH host keys. Allow a generous margin for slower or
  // emulated runners (the builder's own CI waits up to ~40 minutes).
  override get sshReadyTimeout(): number {
    return 2400
  }

  // The KA655 firmware self-test is unreliable when the machine is restarted
  // inside the same simulator process, so reboot isn't supported on VAX.
  override get supportsReboot(): boolean {
    return false
  }
}
