import * as architecture from '../architecture'
import type {OperatingSystem} from '../operating_system'
import {Kind, toKind} from './kind'
import {getOrThrow, Class} from '../utility'

export function operatingSystem(classObject: Class<OperatingSystem>): void {
  const kind = toKind(classObject.name)
  if (kind === undefined) throw Error(`Unrecognized operating system: ${classObject.name}`)
  register(kind, classObject)
}

export function create(
  operatingSystemKind: Kind,
  arch: architecture.Architecture,
  version: string
): OperatingSystem {
  const cls = getOrThrow(operatingSystems, operatingSystemKind)
  return new cls(arch, version)
}

function register(kind: Kind, type: Class<OperatingSystem>): void {
  operatingSystems.set(kind, type)
}

const operatingSystems: Map<Kind, Class<OperatingSystem>> = new Map<Kind, Class<OperatingSystem>>()
