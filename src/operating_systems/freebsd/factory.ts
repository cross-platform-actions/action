import * as architecture from '../../architecture'
import Arm64 from './arm64'
import {Hypervisor, Kind as HypervisorKind} from '../../hypervisor'
import {OperatingSystem} from '../../operating_system'
import {factory, Factory as BaseFactory} from '../factory'
import FreeBsd from './freebsd'

@factory
//@ts-ignore
class FreeBsdFactory extends BaseFactory {
  override createImpl(
    version: string,
    hypervisor: Hypervisor
  ): OperatingSystem {
    return new FreeBsd(this.resolveArchitecture(hypervisor), version)
  }

  override validateHypervisor(kind: HypervisorKind): void {
    this.architecture.validateHypervisor(kind)
  }

  private resolveArchitecture(
    hypervisor: Hypervisor
  ): architecture.Architecture {
    if (this.architecture.kind == architecture.Kind.arm64) {
      return new Arm64(
        this.architecture.kind,
        this.architecture.host,
        hypervisor
      )
    }

    return this.architecture
  }
}
