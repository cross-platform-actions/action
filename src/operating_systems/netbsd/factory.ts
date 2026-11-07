import {OperatingSystem} from '../../operating_system'
import {Class} from '../../utility'
import {factory} from '../factory'
import QemuFactory from '../qemu_factory'
import NetBsd from './netbsd'
import NetBsdVax from './vax'
import NetBsdSparc64 from './sparc64'

factory(
  class NetBsdFactory extends QemuFactory {
    override createImpl(version: string): OperatingSystem {
      const cls = this.architecture.resolve<Class<NetBsd>>({
        vax: NetBsdVax,
        sparc64: NetBsdSparc64,
        default: NetBsd
      })

      return new cls(this.architecture, version)
    }
  }
)
