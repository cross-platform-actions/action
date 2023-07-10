import {Architecture} from '../../architecture'
import {Hypervisor} from '../../hypervisor'

export default class Arm64 extends Architecture.Arm64 {
  override get hypervisor(): Hypervisor {
    return this.host.efiHypervisor
  }
}
