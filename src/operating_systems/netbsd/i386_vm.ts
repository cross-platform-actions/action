import * as qemu_vm from './qemu_vm'
import {capMemory} from '../../utility'

// The NetBSD/i386 kernels have no PAE, so they use only the memory below
// 4 GiB. On the `pc` machine that is all of it, up to just under 3.5 GiB. From
// 3.5 GiB, QEMU moves everything above 3 GiB past 4 GiB, so the action's
// default of 6 GiB would leave the guest 3 GiB.
export class Vm extends qemu_vm.Vm {
  private static readonly maxMemoryMebibytes = 3583

  protected override get memory(): string {
    return capMemory(this.configuration.memory, Vm.maxMemoryMebibytes)
  }
}
