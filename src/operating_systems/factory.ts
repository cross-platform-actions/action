import * as architecture from '../architecture'
import * as os from '../operating_system'
import OpenBsd from './openbsd'
import {getOrThrow} from '../utility'

export function create(
  operatingSystemKind: os.Kind,
  arch: architecture.Architecture,
  version: string
): os.OperatingSystem {
  const cls = getOrThrow(operatingSystemMap(), operatingSystemKind)
  return new cls(arch, version)
}

function operatingSystemMap(): ReadonlyMap<os.Kind, typeof os.FreeBsd> {
  return new Map([
    [os.Kind.freeBsd, os.FreeBsd],
    [os.Kind.netBsd, os.NetBsd],
    [os.Kind.openBsd, OpenBsd]
  ])
}
