import {OperatingSystem} from '../../operating_system'
import {factory} from '../factory'
import QemuFactory from '../qemu_factory'
import DragonFlyBsd from './dragonflybsd'

factory(
  class DragonFlyBsdFactory extends QemuFactory {
    override createImpl(version: string): OperatingSystem {
      return new DragonFlyBsd(this.architecture, version)
    }
  }
)
