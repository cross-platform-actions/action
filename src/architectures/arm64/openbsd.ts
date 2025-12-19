import {Arm64} from './arm64'
import * as hypervisor from '../../hypervisor'

export class Arm64OpenBsd extends Arm64 {
  override get efiHypervisor(): hypervisor.Hypervisor {
    return new QemuEfi()
  }
}

class QemuEfi extends hypervisor.QemuEfi {
  override get firmwareFile(): string {
    return `${this.firmwareDirectory}/linaro_uefi.fd`
  }
}
