import {OperatingSystem} from '../../operating_system'
import {factory} from '../factory'
import QemuFactory from '../qemu_factory'
import NetBsd from './netbsd'

@factory
//@ts-ignore
class NetBsdFactory extends QemuFactory {
  override createImpl(version: string): OperatingSystem {
    return new NetBsd(this.architecture, version)
  }
}
