import {Architecture} from './architecture'
import {ResourceUrls} from './operating_systems/resource_urls'
import {Vm as QemuVm} from './qemu_vm'
import {Vm as XhyveVm} from './xhyve_vm'
import {getOrDefaultOrThrow} from './utility'

export enum Kind {
  xhyve,
  qemu
}

export function toKind(value: string): Kind | undefined {
  return architectureMap[value.toLocaleLowerCase()]
}

const architectureMap: Record<string, Kind> = {
  xhyve: Kind.xhyve,
  qemu: Kind.qemu
} as const

export abstract class Hypervisor {
  abstract get kind(): Kind
  abstract get sshPort(): number
  abstract get firmwareFile(): string
  abstract get vmModule(): typeof QemuVm | typeof XhyveVm
  abstract getResourceUrl(architecture: Architecture): string
  abstract resolve<T>(implementation: Record<string, T>): T
}

export class Xhyve extends Hypervisor {
  override get kind(): Kind {
    return Kind.xhyve
  }

  override get sshPort(): number {
    return 22
  }

  override get firmwareFile(): string {
    return 'uefi.fd'
  }

  override get vmModule(): typeof XhyveVm {
    return XhyveVm
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override getResourceUrl(_architecture: Architecture): string {
    return `${ResourceUrls.create().resourceBaseUrl}/xhyve-macos.tar`
  }

  override resolve<T>(implementation: Record<string, T>): T {
    return getOrDefaultOrThrow(implementation, 'xhyve')
  }
}

export class Qemu extends Hypervisor {
  protected readonly firmwareDirectory = 'share/qemu'

  override get kind(): Kind {
    return Kind.qemu
  }

  get sshPort(): number {
    return 2847
  }

  override get firmwareFile(): string {
    return `${this.firmwareDirectory}/bios-256k.bin`
  }

  override get vmModule(): typeof QemuVm {
    return QemuVm
  }

  override getResourceUrl(architecture: Architecture): string {
    return architecture.resourceUrl
  }

  override resolve<T>(implementation: Record<string, T>): T {
    return getOrDefaultOrThrow(implementation, 'qemu')
  }
}

export class QemuEfi extends Qemu {
  override get firmwareFile(): string {
    return `${this.firmwareDirectory}/uefi.fd`
  }
}

export function toHypervisor(kind: Kind): typeof Xhyve | typeof Qemu {
  return hypervisorMap[kind]
}

const hypervisorMap: Record<Kind, typeof Xhyve | typeof Qemu> = {
  [Kind.xhyve]: Xhyve,
  [Kind.qemu]: Qemu
} as const
