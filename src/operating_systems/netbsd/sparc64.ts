import NetBsd from './netbsd'
import * as sparc64_vm from './sparc64_vm'
import {Class} from '../../utility'
import * as vm from '../../vm'
import {
  Hypervisor,
  QemuSparc64 as QemuSparc64Hypervisor
} from '../../hypervisor'
import {Variant} from '../../action/variant'

// NetBSD on QEMU's `sun4u` machine, which is always emulated.
export default class NetBsdSparc64 extends NetBsd {
  override get vmClass(): Class<vm.Vm> {
    return sparc64_vm.Vm
  }

  // `microvm` is an x86 machine type.
  override get supportedVariants(): Variant[] {
    return [Variant.default]
  }

  protected override vmClassFor(): Class<vm.Vm> {
    return this.vmClass
  }

  override get hypervisor(): Hypervisor {
    return new QemuSparc64Hypervisor()
  }

  // Booting to a reachable sshd takes two to seven minutes under emulation.
  override get sshReadyTimeout(): number {
    return 900
  }

  // The guest never comes back from a reboot: OpenBIOS on sun4u fails to boot
  // the machine again once the kernel has restarted it.
  override get supportsReboot(): boolean {
    return false
  }
}
