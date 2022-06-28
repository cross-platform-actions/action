import * as process from 'process'

import * as architecture from './architecture'
import * as qemu from './qemu_vm'
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

interface Implementation<MacOsType, LinuxType> {
  macos: MacOsType
  linux: LinuxType
}

export abstract class Host {
  static create(): Host {
    switch (kind) {
      case Kind.darwin:
        return new MacOs()
      case Kind.linux:
        return new Linux()
      default:
        throw Error(`Unhandled host platform: ${kind}`)
    }
  }

  abstract get workDirectory(): string
  abstract get vmModule(): typeof xhyve | typeof qemu
  abstract resolve<MacOsType, LinuxType>(
    implementation: Implementation<MacOsType, LinuxType>
  ): MacOsType | LinuxType

  abstract canRunXhyve(arch: architecture.Architecture): boolean

  toString = () => this.constructor.name.toLocaleLowerCase()
}

class MacOs extends Host {
  get workDirectory(): string {
    return '/Users/runner/work'
  }

  get vmModule(): typeof xhyve | typeof qemu {
    return xhyve
  }

  resolve<MacOs, Linux>(
    implementation: Implementation<MacOs, Linux>
  ): MacOs | Linux {
    return implementation.macos
  }

  canRunXhyve(arch: architecture.Architecture): boolean {
    return arch.kind === architecture.Kind.x86_64
  }
}

class Linux extends Host {
  get workDirectory(): string {
    return '/home/runner/work'
  }

  get vmModule(): typeof xhyve | typeof qemu {
    return qemu
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  canRunXhyve(_arch: architecture.Architecture): boolean {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return false
  }

  resolve<MacOs, Linux>(
    implementation: Implementation<MacOs, Linux>
  ): MacOs | Linux {
    return implementation.linux
  }
}

export const host = Host.create()
