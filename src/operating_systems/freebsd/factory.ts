import {Kind as HypervisorKind} from '../../hypervisor'
import {OperatingSystem} from '../../operating_system'
import {factory, Factory as BaseFactory} from '../factory'
import FreeBsd from './freebsd'

factory(
  class FreeBsdFactory extends BaseFactory {
    override createImpl(version: string): OperatingSystem {
      return new FreeBsd(this.architecture, version)
    }

    protected override validateHypervisor(kind: HypervisorKind): void {
      this.architecture.validateHypervisor(kind)
    }
  }
)
