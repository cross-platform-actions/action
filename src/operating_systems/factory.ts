import * as architecture from '../architecture'
import type {OperatingSystem} from '../operating_system'
import * as os from '../operating_systems/kind'
import {getOrThrow, Class} from '../utility'
import * as hypervisor from '../hypervisor'

export abstract class Factory {
  readonly architecture: architecture.Architecture

  constructor(arch: architecture.Architecture) {
    this.architecture = arch
  }

  static for(kind: os.Kind, arch: architecture.Architecture): Factory {
    const cls = getOrThrow(factories, `${kind.name}factory`)
    return new cls(arch)
  }

  create(version: string, vmm: hypervisor.Hypervisor): OperatingSystem {
    this.validateHypervisor(vmm.kind)
    return this.createImpl(version, vmm)
  }

  abstract createImpl(
    version: string,
    hypervisor: hypervisor.Hypervisor
  ): OperatingSystem

  protected validateHypervisor(kind: hypervisor.Kind): void {
    switch (kind) {
      case hypervisor.Kind.qemu:
        break
      case hypervisor.Kind.xhyve:
        throw new Error(
          `Unsupported hypervisor for this operating system: xhyve`
        )
      default:
        throw new Error(`Internal Error: Unhandled hypervisor kind: ${kind}`)
    }
  }
}

export function operatingSystem(classObject: Class<OperatingSystem>): void {
  const name = classObject.name.toLocaleLowerCase()
  register(name, classObject)
}

export function factory(classObject: Class<Factory>): void {
  const name = classObject.name.toLocaleLowerCase()
  registerFactory(name, classObject)
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

function registerFactory(name: string, type: Class<Factory>): void {
  factories.set(name, type)
}

const factories: Map<string, Class<Factory>> = new Map<string, Class<Factory>>()
