import {Hypervisor, Kind as HypervisorKind} from '../../hypervisor'
import {OperatingSystem} from '../../operating_system'
import {factory, Factory as BaseFactory} from '../factory'
import OpenBsd from './openbsd'

@factory
//@ts-ignore
class OpenBsdFactory extends BaseFactory {
  override createImpl(
    version: string,
    _hypervisor: Hypervisor
  ): OperatingSystem {
    return new OpenBsd(this.architecture, version)
  }

  override validateHypervisor(kind: HypervisorKind): void {
    this.architecture.validateHypervisor(kind)
  }
}
