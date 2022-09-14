import {Host} from './host'
import HostQemu from './host_qemu'
import * as hypervisor from './hypervisor'
import {ResourceUrls} from './operating_systems/resource_urls'
import {getOrThrow, getOrDefaultOrThrow} from './utility'
import * as vm from './vm'
import * as os_kind from './operating_systems/kind'

export enum Kind {
  arm64,
  x86_64
}

export abstract class Architecture {
  readonly kind: Kind
  protected readonly resourceBaseUrl = ResourceUrls.create().resourceBaseUrl
  protected readonly host: Host

  constructor(kind: Kind, host: Host) {
    this.kind = kind
    this.host = host
  }

  static for(
    kind: Kind,
    host: Host,
    operating_system: os_kind.Kind
  ): Architecture {
    if (kind == Kind.x86_64 && operating_system == os_kind.Kind.openBsd)
      return new Architecture.X86_64OpenBsd(kind, host)

    return new (getOrThrow(Architecture.architectureMap, kind))(kind, host)
  }

  abstract get name(): string
  abstract get resourceUrl(): string
  abstract get cpu(): string
  abstract get machineType(): string
  abstract get accelerator(): vm.Accelerator
  abstract get canRunXhyve(): boolean
  abstract get hypervisor(): hypervisor.Hypervisor

  get networkDevice(): string {
    return 'virtio-net'
  }

  resolve<T>(implementation: Record<string, T>): T {
    const name = this.constructor.name.toLocaleLowerCase()
    return getOrDefaultOrThrow(implementation, name)
  }

  protected get hostString(): string {
    return this.host.toString()
  }

  protected get hostQemu(): HostQemu {
    return this.host.qemu
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

    override get hypervisor(): hypervisor.Hypervisor {
      return new hypervisor.Qemu()
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

    override get hypervisor(): hypervisor.Hypervisor {
      return this.host.hypervisor
    }
  }

  private static readonly X86_64OpenBsd = class extends this.X86_64 {
    override get networkDevice(): string {
      return 'e1000'
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
  aarch64: Kind.arm64,
  'x86-64': Kind.x86_64,
  x86_64: Kind.x86_64
} as const
