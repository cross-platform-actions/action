import {Architecture} from './architecture'
import {getOrDefaultOrThrow} from './utility'

export enum Kind {
  qemu,
  simh
}

export interface Hypervisor {
  get kind(): Kind
  get sshPort(): number
  get firmwareFile(): string
  get binaryDirectory(): string
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

  get binaryDirectory(): string {
    return 'bin'
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

// RISC-V boots via QEMU's built-in OpenSBI plus U-Boot, which is loaded as the
// kernel (see the FreeBSD QemuVmRiscv64). U-Boot then EFI-boots the disk image
// and forwards the device tree to the FreeBSD loader.
export class QemuRiscv extends Qemu {
  override get firmwareFile(): string {
    return `${this.firmwareDirectory}/u-boot.bin`
  }

  override get efi(): Hypervisor {
    return this
  }
}

export class Simh implements Hypervisor {
  get kind(): Kind {
    return Kind.simh
  }

  get sshPort(): number {
    return 2847
  }

  // SIMH simulators have their firmware built in.
  get firmwareFile(): string {
    return ''
  }

  // The simulator binary is located at the root of the archive.
  get binaryDirectory(): string {
    return ''
  }

  get efi(): Hypervisor {
    throw Error('SIMH does not support EFI')
  }

  getResourceUrl(architecture: Architecture): string {
    return architecture.resourceUrl
  }

  resolve<T>(implementation: Record<string, T>): T {
    return getOrDefaultOrThrow(implementation, 'simh')
  }
}
