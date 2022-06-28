import * as host from './host'
import {ResourceUrls} from './operating_systems/resource_urls'
import * as vm from './vm'

export enum Kind {
  arm64,
  x86_64
}

export abstract class Architecture2 {
  readonly kind: Kind
  protected readonly resourceBaseUrl = ResourceUrls.create().resourceBaseUrl

  constructor(kind: Kind) {
    this.kind = kind
  }

  static for(kind: Kind): Architecture2 {
    switch (kind) {
      case Kind.arm64:
        return new this.Arm64(kind)
      case Kind.x86_64:
        return new this.X86_64(kind)
    }
  }

  abstract get resourceUrl(): string
  abstract get cpu(): string
  abstract get machineType(): string
  abstract get accelerator(): vm.Accelerator

  private static readonly Arm64 = class extends Architecture2 {
    override get resourceUrl(): string {
      return `${this.resourceBaseUrl}/qemu-system-aarch64-${hostString}.tar`
    }

    override get cpu(): string {
      return 'cortex-a57'
    }

    override get machineType(): string {
      return 'virt'
    }

    override get accelerator(): vm.Accelerator {
      return vm.Accelerator.tcg
    }
  }

  private static readonly X86_64 = class extends Architecture2 {
    override get resourceUrl(): string {
      return `${this.resourceBaseUrl}/qemu-system-x86_64-${hostString}.tar`
    }

    override get cpu(): string {
      return host.kind === host.Kind.darwin ? 'host' : 'qemu64'
    }

    override get machineType(): string {
      return 'pc'
    }

    override get accelerator(): vm.Accelerator {
      return host.kind === host.Kind.darwin
        ? vm.Accelerator.hvf
        : vm.Accelerator.tcg
    }
  }
}

export interface Architecture {
  readonly kind: Kind
  readonly resourceUrl: string
  readonly cpu: string
  readonly machineType: string
  readonly accelerator: vm.Accelerator
}

export function getArchitecture(kind: Kind): Architecture {
  const arch = architectures.get(kind)

  if (arch === undefined)
    throw Error(`Unreachable: missing Kind.${kind} in 'architectures'`)

  return arch
}

const hostString = host.host.toString()

const architectures: ReadonlyMap<Kind, Architecture> = (() => {
  const map = new Map<Kind, Architecture>()
  const resourceBaseUrl = ResourceUrls.create().resourceBaseUrl

  map.set(Kind.arm64, {
    kind: Kind.arm64,
    cpu: 'cortex-a57',
    machineType: 'virt',
    accelerator: vm.Accelerator.tcg,
    resourceUrl: `${resourceBaseUrl}/qemu-system-aarch64-${hostString}.tar`
  })

  map.set(Kind.x86_64, {
    kind: Kind.x86_64,
    cpu: host.kind === host.Kind.darwin ? 'host' : 'qemu64',
    machineType: 'pc',
    accelerator:
      host.kind === host.Kind.darwin ? vm.Accelerator.hvf : vm.Accelerator.tcg,
    resourceUrl: `${resourceBaseUrl}/qemu-system-x86_64-${hostString}.tar`
  })

  return map
})()

export function toKind(value: string): Kind | undefined {
  return fromString.get(value.toLowerCase())
}

export function toString(kind: Kind): string {
  for (const [key, value] of fromString) {
    if (value === kind) return key
  }

  throw Error(`Unreachable: missing Kind.${kind} in 'fromString'`)
}

const fromString: ReadonlyMap<string, Kind> = (() => {
  const map = new Map<string, Kind>()
  map.set('arm64', Kind.arm64)
  map.set('x86-64', Kind.x86_64)
  return map
})()
