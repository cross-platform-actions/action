import {Architecture} from './architecture'
import {ResourceUrls} from './operating_systems/resource_urls'

export abstract class Hypervisor {
  abstract get sshPort(): number
  abstract get firmwareFile(): string
  abstract getResourceUrl(architecture: Architecture): string
}

export class Xhyve extends Hypervisor {
  override get sshPort(): number {
    return 22
  }

  override get firmwareFile(): string {
    return 'uefi.fd'
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override getResourceUrl(_architecture: Architecture): string {
    return `${ResourceUrls.create().resourceBaseUrl}/xhyve-macos.tar`
  }
}

export class Qemu extends Hypervisor {
  protected readonly firmwareDirectory = 'share/qemu'

  get sshPort(): number {
    return 2847
  }

  override get firmwareFile(): string {
    return `${this.firmwareDirectory}/bios-256k.bin`
  }

  override getResourceUrl(architecture: Architecture): string {
    return architecture.resourceUrl
  }
}

export class QemuEfi extends Qemu {
  override get firmwareFile(): string {
    return `${this.firmwareDirectory}/uefi.fd`
  }
}
