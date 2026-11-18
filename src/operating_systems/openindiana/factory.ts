import {OperatingSystem} from '../../operating_system'
import {factory} from '../factory'
import QemuFactory from '../qemu_factory'
import OpenIndiana from './openindiana'

factory(
  class OpenIndianaFactory extends QemuFactory {
    override createImpl(version: string): OperatingSystem {
      return new OpenIndiana(this.architecture, version)
    }
  }
)
