import {Architecture} from './architecture'
import {Vm as QemuVm} from './qemu_vm'
import {getOrDefaultOrThrow} from './utility'

export enum Kind {
  qemu
}

export function toKind(value: string): Kind | undefined {
  return kindMap[value.toLocaleLowerCase()]
}

const kindMap: Record<string, Kind> = {
  qemu: Kind.qemu
} as const

export interface Hypervisor {
  get kind(): Kind
  get sshPort(): number
  get firmwareFile(): string
  get vmModule(): typeof QemuVm
  get efi(): Hypervisor
  getResourceUrl(architecture: Architecture): string
  resolve<T>(implementation: Record<string, T>): T
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

export function toHypervisor(kind: Kind): typeof Qemu {
  return hypervisorMap[kind]
}

const hypervisorMap: Record<Kind, typeof Qemu> = {
  [Kind.qemu]: Qemu
} as const
