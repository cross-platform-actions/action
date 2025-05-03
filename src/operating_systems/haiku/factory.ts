import {OperatingSystem} from '../../operating_system'
import {factory} from '../factory'
import QemuFactory from '../qemu_factory'
import Haiku from './haiku'

@factory
//@ts-ignore
class HaikuFactory extends QemuFactory {
  override createImpl(version: string): OperatingSystem {
    return new Haiku(this.architecture, version)
  }
}
