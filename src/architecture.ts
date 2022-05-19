import * as host from './host'
import {ResourceUrls} from './operating_systems/resource_urls'
import * as vm from './vm'

export enum Kind {
  arm64,
  x86_64
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

const hostString = host.toString(host.kind)

const architectures: ReadonlyMap<Kind, Architecture> = (() => {
  const map = new Map<Kind, Architecture>()
  const resourceBaseUrl = ResourceUrls.create().resourceBaseUrl

  map.set(Kind.arm64, {
    kind: Kind.arm64,
    cpu: 'cortex-a57',
    machineType: 'virt',
    accelerator: vm.Accelerator.tcg,
    resourceUrl: `${resourceBaseUrl}v0.3.1/qemu-system-aarch64-${hostString}.tar`
  })

  map.set(Kind.x86_64, {
    kind: Kind.x86_64,
    cpu: host.kind === host.Kind.darwin ? 'host' : 'qemu64',
    machineType: 'pc',
    accelerator:
      host.kind === host.Kind.darwin ? vm.Accelerator.hvf : vm.Accelerator.tcg,
    resourceUrl: `${resourceBaseUrl}v0.4.0/qemu-system-x86_64-${hostString}.tar`
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
