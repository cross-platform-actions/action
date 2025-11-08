import {OperatingSystem} from '../../operating_system'
import {factory} from '../factory'
import QemuFactory from '../qemu_factory'
import OmniOs from './omnios'

@factory
//@ts-ignore
class OmniOsFactory extends QemuFactory {
  override createImpl(version: string): OperatingSystem {
    return new OmniOs(this.architecture, version)
  }
}
