import NetBsd from './netbsd'
import * as i386_vm from './i386_vm'
import {Class} from '../../utility'
import * as vm from '../../vm'
import {Variant} from '../../action/variant'

// NetBSD on 32-bit x86, which boots like x86-64 apart from its memory.
export default class NetBsdI386 extends NetBsd {
  override get vmClass(): Class<vm.Vm> {
    return i386_vm.Vm
  }

  // The images carry no kernel for `microvm`.
  override get supportedVariants(): Variant[] {
    return [Variant.default]
  }

  protected override vmClassFor(): Class<vm.Vm> {
    return this.vmClass
  }
}
