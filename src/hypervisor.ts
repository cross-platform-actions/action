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

export interface Hypervisor {
  get kind(): Kind
  get sshPort(): number
  get firmwareFile(): string
  get vmModule(): typeof QemuVm | typeof XhyveVm
  get efi(): Hypervisor
  getResourceUrl(architecture: Architecture): string
  resolve<T>(implementation: Record<string, T>): T
}

export class Xhyve implements Hypervisor {
  get kind(): Kind {
    return Kind.xhyve
  }

  get sshPort(): number {
    return 22
  }

  get firmwareFile(): string {
    return 'uefi.fd'
  }

  get vmModule(): typeof XhyveVm {
    return XhyveVm
  }

  get efi(): Hypervisor {
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getResourceUrl(_architecture: Architecture): string {
    return `${ResourceUrls.create().resourceBaseUrl}/xhyve-macos.tar`
  }

  resolve<T>(implementation: Record<string, T>): T {
    return getOrDefaultOrThrow(implementation, 'xhyve')
  }
}

export class Qemu implements Hypervisor {
  protected readonly firmwareDirectory = 'share/qemu'

  get kind(): Kind {
    return Kind.qemu
  }

  get sshPort(): number {
    return 2847
  }

  get firmwareFile(): string {
    return `${this.firmwareDirectory}/bios-256k.bin`
  }

  get vmModule(): typeof QemuVm {
    return QemuVm
  }

  get efi(): Hypervisor {
    return new QemuEfi()
  }

  getResourceUrl(architecture: Architecture): string {
    return architecture.resourceUrl
  }

  resolve<T>(implementation: Record<string, T>): T {
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
