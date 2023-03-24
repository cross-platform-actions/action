import {Hypervisor, Qemu} from '../../hypervisor'
import {OperatingSystem} from '../../operating_system'
import {factory, Factory as BaseFactory} from '../factory'
import NetBsd from './netbsd'

@factory
//@ts-ignore
class NetBsdFactory extends BaseFactory {
  override get defaultHypervisor(): Hypervisor {
    return new Qemu()
  }

  override create(version: string, hypervisor: Hypervisor): OperatingSystem {
    return new NetBsd(this.architecture, version, hypervisor)
  }
}
