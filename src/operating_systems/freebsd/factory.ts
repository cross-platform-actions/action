import {OperatingSystem} from '../../operating_system'
import {factory, Factory as BaseFactory} from '../factory'
import FreeBsd from './freebsd'

@factory
//@ts-ignore
class FreeBsdFactory extends BaseFactory {
  override createImpl(version: string): OperatingSystem {
    return new FreeBsd(this.architecture, version)
  }
}
