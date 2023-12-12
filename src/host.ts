import * as process from 'process'

import HostQemu from './host_qemu'
import * as hypervisor from './hypervisor'
import * as qemu from './qemu_vm'
import {getImplementation} from './utility'
import * as xhyve from './xhyve_vm'

class Module {
  private static host_: Module.Host | undefined

  static get host(): Module.Host {
    return this.host_ ? this.host_ : (this.host_ = Module.Host.create())
  }
}

export = Module

// The reason for this namesapce is to allow a global getter (`host`, see above).
// See https://stackoverflow.com/questions/28834873/getter-setter-on-a-module-in-typescript
namespace Module {
  export abstract class Host {
    static create(platform: string = process.platform): Host {
      switch (platform) {
        case 'darwin':
          return new MacOs()
        case 'linux':
          return new Linux()
        default:
          throw Error(`Unhandled host platform: ${platform}`)
      }
    }

    abstract get vmModule(): typeof xhyve | typeof qemu
    abstract get qemu(): HostQemu
    abstract get hypervisor(): hypervisor.Hypervisor
    abstract get efiHypervisor(): hypervisor.Hypervisor
    abstract get defaultMemory(): string
    abstract get defaultCpuCount(): number
    abstract validateHypervisor(kind: hypervisor.Kind): void

    resolve<T>(implementation: Record<string, T>): T {
      return getImplementation(this, implementation)
    }

    toString(): string {
      return this.constructor.name.toLocaleLowerCase()
    }
  }

  class MacOs extends Host {
    get vmModule(): typeof xhyve | typeof qemu {
      return xhyve
    }

    override get qemu(): HostQemu {
      return new HostQemu.MacosHostQemu()
    }

    override get hypervisor(): hypervisor.Hypervisor {
      return new hypervisor.Xhyve()
    }

    override get efiHypervisor(): hypervisor.Hypervisor {
      return this.hypervisor
    }

    override get defaultMemory(): string {
      return '13G'
    }

    override get defaultCpuCount(): number {
      return 3
    }

    override validateHypervisor(kind: hypervisor.Kind): void {
      switch (kind) {
        case hypervisor.Kind.qemu:
          break
        case hypervisor.Kind.xhyve:
          break
        default:
          throw new Error(`Internal Error: Unhandled hypervisor kind: ${kind}`)
      }
    }
  }

  class Linux extends Host {
    get vmModule(): typeof xhyve | typeof qemu {
      return qemu
    }

    override get qemu(): HostQemu {
      return new HostQemu.LinuxHostQemu()
    }

    override get hypervisor(): hypervisor.Hypervisor {
      return new hypervisor.Qemu()
    }

    override get efiHypervisor(): hypervisor.Hypervisor {
      return new hypervisor.QemuEfi()
    }

    override get defaultMemory(): string {
      return '6G'
    }

    override get defaultCpuCount(): number {
      return 2
    }

    override validateHypervisor(kind: hypervisor.Kind): void {
      switch (kind) {
        case hypervisor.Kind.qemu:
          break
        case hypervisor.Kind.xhyve:
          throw new Error('Unsupported hypervisor on Linux hosts: xhyve')
        default:
          throw new Error(`Internal Error: Unhandled hypervisor kind: ${kind}`)
      }
    }
  }
}
