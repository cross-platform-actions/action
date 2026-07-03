import {OperatingSystem} from '../../operating_system'
import {Class} from '../../utility'
import {factory} from '../factory'
import QemuFactory from '../qemu_factory'
import NetBsd from './netbsd'
import NetBsdVax from './vax'

factory(
  class NetBsdFactory extends QemuFactory {
    override createImpl(version: string): OperatingSystem {
      const cls = this.architecture.resolve<Class<NetBsd>>({
        vax: NetBsdVax,
        default: NetBsd
      })

      return new cls(this.architecture, version)
    }
  }
)
