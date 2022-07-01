import * as process from 'process'

import * as architecture from './architecture'
import HostQemu from './host_qemu'
import * as hypervisor from './hypervisor'
import * as qemu from './qemu_vm'
import {getImplementation} from './utility'
import * as xhyve from './xhyve_vm'

export enum Kind {
  darwin,
  linux
}

export const kind = toKind(process.platform)

function toKind(value: string): Kind {
  switch (value) {
    case 'darwin':
      return Kind.darwin
    case 'linux':
      return Kind.linux
    default:
      throw Error(`Unhandled host platform: ${value}`)
  }
}

export abstract class Host {
  static create(k: Kind = getCurrentKind()): Host {
    switch (k) {
      case Kind.darwin:
        return new MacOs()
      case Kind.linux:
        return new Linux()
      default:
        throw Error(`Unhandled host platform: ${k}`)
    }
  }

  abstract get workDirectory(): string
  abstract get vmModule(): typeof xhyve | typeof qemu
  abstract get qemu(): HostQemu
  abstract canRunXhyve(arch: architecture.Architecture): boolean
  abstract get hypervisor(): hypervisor.Hypervisor

  resolve<T>(implementation: Record<string, T>): T {
    return getImplementation(this, implementation)
  }

  toString(): string {
    return this.constructor.name.toLocaleLowerCase()
  }
}

class MacOs extends Host {
  get workDirectory(): string {
    return '/Users/runner/work'
  }

  get vmModule(): typeof xhyve | typeof qemu {
    return xhyve
  }

  override get qemu(): HostQemu {
    return new HostQemu.MacosHostQemu()
  }

  override canRunXhyve(arch: architecture.Architecture): boolean {
    return arch.canRunXhyve
  }

  override get hypervisor(): hypervisor.Hypervisor {
    return new hypervisor.Xhyve()
  }
}

class Linux extends Host {
  get workDirectory(): string {
    return '/home/runner/work'
  }

  get vmModule(): typeof xhyve | typeof qemu {
    return qemu
  }

  override get qemu(): HostQemu {
    return new HostQemu.LinuxHostQemu()
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  override canRunXhyve(_arch: architecture.Architecture): boolean {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return false
  }

  override get hypervisor(): hypervisor.Hypervisor {
    return new hypervisor.Qemu()
  }
}

function getCurrentKind(): Kind {
  return toKind(process.platform)
}
export const host = Host.create()
