import * as host from './host'
import {ResourceUrls} from './operating_systems/resource_urls'
import HostQemu from './host_qemu'
import {getOrThrow, getOrDefaultOrThrow} from './utility'
import * as vm from './vm'

export enum Kind {
  arm64,
  x86_64
}

export abstract class Architecture {
  readonly kind: Kind
  protected readonly resourceBaseUrl = ResourceUrls.create().resourceBaseUrl
  protected readonly hostQemu: HostQemu

  constructor(kind: Kind, hostQemu: HostQemu) {
    this.kind = kind
    this.hostQemu = hostQemu
  }

  static for(kind: Kind, hostQemu: HostQemu): Architecture {
    return new (getOrThrow(Architecture.architectureMap, kind))(kind, hostQemu)
  }

  abstract get name(): string
  abstract get resourceUrl(): string
  abstract get cpu(): string
  abstract get machineType(): string
  abstract get accelerator(): vm.Accelerator
  abstract get canRunXhyve(): boolean

  resolve<T>(implementation: Record<string, T>): T {
    const name = this.constructor.name.toLocaleLowerCase()
    return getOrDefaultOrThrow(implementation, name)
  }

  protected get hostString(): string {
    return host.host.toString()
  }

  private static readonly Arm64 = class extends Architecture {
    override get name(): string {
      return 'arm64'
    }

    override get resourceUrl(): string {
      return `${this.resourceBaseUrl}/qemu-system-aarch64-${this.hostString}.tar`
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

    override get canRunXhyve(): boolean {
      return false
    }
  }

  private static readonly X86_64 = class extends Architecture {
    override get name(): string {
      return 'x86-64'
    }

    override get resourceUrl(): string {
      return `${this.resourceBaseUrl}/qemu-system-x86_64-${this.hostString}.tar`
    }

    override get cpu(): string {
      return this.hostQemu.cpu
    }

    override get machineType(): string {
      return 'pc'
    }

    override get accelerator(): vm.Accelerator {
      return this.hostQemu.accelerator
    }

    override get canRunXhyve(): boolean {
      return true
    }
  }

  private static readonly architectureMap: ReadonlyMap<
    Kind,
    typeof Architecture.Arm64
  > = new Map([
    [Kind.arm64, Architecture.Arm64],
    [Kind.x86_64, Architecture.X86_64]
  ])
}

export function toKind(value: string): Kind | undefined {
  return architectureMap[value.toLocaleLowerCase()]
}

const architectureMap: Record<string, Kind> = {
  arm64: Kind.arm64,
  'x86-64': Kind.x86_64
} as const
