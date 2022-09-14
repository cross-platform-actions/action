import {OperatingSystem} from '../operating_system'

export abstract class Qemu extends OperatingSystem {
  get ssHostPort(): number {
    return 2847
  }
}
