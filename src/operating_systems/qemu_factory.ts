import {Kind} from '../hypervisor'
import {Factory as BaseFactory} from './factory'

export default abstract class QemuFactory extends BaseFactory {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override validateHypervisor(_kind: Kind): void {}
}
