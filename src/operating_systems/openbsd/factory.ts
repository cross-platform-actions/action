import {Kind as HypervisorKind} from '../../hypervisor'
import {OperatingSystem} from '../../operating_system'
import {factory, Factory as BaseFactory} from '../factory'
import OpenBsd from './openbsd'

factory(
  class OpenBsdFactory extends BaseFactory {
    override createImpl(version: string): OperatingSystem {
      return new OpenBsd(this.architecture, version)
    }

    protected override validateHypervisor(kind: HypervisorKind): void {
      this.architecture.validateHypervisor(kind)
    }
  }
)
