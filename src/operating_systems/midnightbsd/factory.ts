import {OperatingSystem} from '../../operating_system'
import {factory} from '../factory'
import QemuFactory from '../qemu_factory'
import MidnightBsd from './midnightbsd'

@factory
//@ts-ignore
class MidnightBsdFactory extends QemuFactory {
  override createImpl(version: string): OperatingSystem {
    return new MidnightBsd(this.architecture, version)
  }
}
