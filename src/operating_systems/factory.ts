import * as architecture from '../architecture'
import type {OperatingSystem} from '../operating_system'
import * as os from '../operating_systems/kind'
import {getOrThrow, Class} from '../utility'

export function operatingSystem(classObject: Class<OperatingSystem>): void {
  const name = classObject.name.toLocaleLowerCase()
  register(name, classObject)
}

export function create(
  kind: os.Kind,
  arch: architecture.Architecture,
  version: string
): OperatingSystem {
  const cls = getOrThrow(operatingSystems, kind.name)
  return new cls(arch, version)
}

export function isValid(name: string): boolean {
  return operatingSystems.has(name)
}

function register(name: string, type: Class<OperatingSystem>): void {
  operatingSystems.set(name, type)
}

const operatingSystems: Map<string, Class<OperatingSystem>> = new Map<
  string,
  Class<OperatingSystem>
>()
