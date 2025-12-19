import {Architecture} from '../architecture'
import {Kind} from './kind'
import {Host} from '../host'
import * as os from '../operating_systems/kind'
import * as hypervisor from '../hypervisor'
import {Arm64} from './arm64/arm64'
import {Arm64OpenBsd} from './arm64/openbsd'
import {X86_64} from './x86_64/x86_64'
import {X86_64OpenBsd} from './x86_64/openbsd'
import OpenBsd from '../operating_systems/openbsd/openbsd'
import {getOrThrow} from '../utility'

export class Factory {
  static for(
    kind: Kind,
    host: Host,
    operating_system: os.Kind,
    hypervisor: hypervisor.Hypervisor
  ): Architecture {
    if (operating_system.is(OpenBsd)) {
      if (kind == Kind.x86_64)
        return new X86_64OpenBsd(kind, host, hypervisor)
      else if (kind == Kind.arm64)
        return new Arm64OpenBsd(kind, host, hypervisor)
    }

    return new (getOrThrow(architectureMap, kind))(kind, host, hypervisor)
  }
}

const architectureMap: ReadonlyMap<Kind, typeof X86_64> = new Map([
  [Kind.arm64, Arm64],
  [Kind.x86_64, X86_64]
])
