import * as architecture from '../architecture'
import type {OperatingSystem} from '../operating_system'
import {Kind} from './kind'
import NetBsd from './netbsd'
import OpenBsd from './openbsd'
import {getOrThrow} from '../utility'

export function create(
  operatingSystemKind: Kind,
  arch: architecture.Architecture,
  version: string
): OperatingSystem {
  const cls = getOrThrow(operatingSystemMap(), operatingSystemKind)
  return new cls(arch, version)
}

function operatingSystemMap(): ReadonlyMap<Kind, typeof os.FreeBsd> {
  return new Map([
    [Kind.freeBsd, os.FreeBsd],
    [Kind.netBsd, NetBsd],
    [Kind.openBsd, OpenBsd]
  ])
}
