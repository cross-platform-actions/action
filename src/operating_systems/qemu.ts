import {Hypervisor, Qemu as QemuHypervisor} from '../hypervisor'
import {OperatingSystem} from '../operating_system'

export abstract class Qemu extends OperatingSystem {
  override get hypervisor(): Hypervisor {
    return new QemuHypervisor()
  }

  get ssHostPort(): number {
    return 2847
  }
}
