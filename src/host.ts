import * as process from 'process'

import HostQemu from './host_qemu'
import * as hypervisor from './hypervisor'
import * as qemu from './qemu_vm'
import {getImplementation} from './utility'

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
        case 'linux':
          return new Linux()
        default:
          throw Error(`Unhandled host platform: ${platform}`)
      }
    }

    abstract get vmModule(): typeof qemu
    abstract get qemu(): HostQemu
    abstract get hypervisor(): hypervisor.Hypervisor
    abstract get efiHypervisor(): hypervisor.Hypervisor
    abstract get defaultMemory(): string
    abstract get defaultCpuCount(): number

    resolve<T>(implementation: Record<string, T>): T {
      return getImplementation(this, implementation)
    }

    toString(): string {
      return this.constructor.name.toLocaleLowerCase()
    }
  }

  class Linux extends Host {
    get vmModule(): typeof qemu {
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
  }
}
