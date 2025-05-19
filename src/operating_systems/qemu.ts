import {
  Hypervisor,
  Qemu as QemuHypervisor,
  QemuEfi as QemuEfiHypervisor
} from '../hypervisor'
import {OperatingSystem} from '../operating_system'

export abstract class Qemu extends OperatingSystem {
  get hypervisorUrl(): string {
    return this.architecture.resourceUrl
  }

  override get hypervisor(): Hypervisor {
    const cls = this.architecture.resolve({
      arm64: QemuEfiHypervisor,
      x86_64: QemuHypervisor
    })

    return new cls()
  }

  get ssHostPort(): number {
    return 2847
  }
}
