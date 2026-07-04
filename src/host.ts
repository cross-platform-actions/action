import * as process from 'process'

import HostQemu from './host_qemu'
import * as hypervisor from './hypervisor'
import * as qemu from './qemu_vm'
import {getImplementation} from './utility'

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

// Lazily created so that the host platform is only resolved on demand,
// which keeps merely importing this module side-effect free.
let host_: Host | undefined

export function host(): Host {
  return (host_ ??= Host.create())
}
