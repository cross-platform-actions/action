import * as architecture from '../architecture'
import type {OperatingSystem} from '../operating_system'
import {Kind} from './kind'
import FreeBsd from './freebsd'
import NetBsd from './netbsd/netbsd'
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

function operatingSystemMap(): ReadonlyMap<Kind, typeof FreeBsd> {
  return new Map([
    [Kind.freeBsd, FreeBsd],
    [Kind.netBsd, NetBsd],
    [Kind.openBsd, OpenBsd]
  ])
}
