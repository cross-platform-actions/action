import {Host} from './host'
import HostQemu from './host_qemu'
import * as hypervisor from './hypervisor'
import {ResourceUrls} from './operating_systems/resource_urls'
import * as os from './operating_systems/kind'
import OpenBsd from './operating_systems/openbsd/openbsd'
import {getOrThrow, getOrDefaultOrThrow} from './utility'
import * as vm from './vm'

export enum Kind {
  arm64,
  x86_64
}

export abstract class Architecture {
  readonly kind: Kind
  readonly host: Host

  protected readonly resourceBaseUrl = ResourceUrls.create().resourceBaseUrl

  private selectedHypervisor: hypervisor.Hypervisor

  constructor(kind: Kind, host: Host, hypervisor: hypervisor.Hypervisor) {
    this.kind = kind
    this.host = host
    this.selectedHypervisor = hypervisor
  }

  static for(
    kind: Kind,
    host: Host,
    operating_system: os.Kind,
    hypervisor: hypervisor.Hypervisor
  ): Architecture {
    if (operating_system.is(OpenBsd)) {
      if (kind == Kind.x86_64)
        return new Architecture.X86_64OpenBsd(kind, host, hypervisor)
      else if (kind == Kind.arm64)
        return new Architecture.Arm64OpenBsd(kind, host, hypervisor)
    }

    return new (getOrThrow(Architecture.architectureMap, kind))(
      kind,
      host,
      hypervisor
    )
  }

  abstract get name(): string
  abstract get resourceUrl(): string
  abstract get cpu(): string
  abstract get machineType(): string
  abstract get accelerator(): vm.Accelerator
  abstract get hypervisor(): hypervisor.Hypervisor
  abstract get efiHypervisor(): hypervisor.Hypervisor

  get networkDevice(): string {
    return 'virtio-net'
  }

  get resolveName(): string {
    return this.constructor.name
  }

  resolve<T>(implementation: Record<string, T>): T {
    const name = this.resolveName.toLocaleLowerCase()
    return getOrDefaultOrThrow(implementation, name)
  }

  validateHypervisor(kind: hypervisor.Kind): void {
    this.host.validateHypervisor(kind)
  }

  protected get hostString(): string {
    return this.host.toString()
  }

  protected get hostQemu(): HostQemu {
    return this.host.qemu
  }

  static readonly Arm64 = class extends Architecture {
    override get name(): string {
      return 'arm64'
    }

    override get resolveName(): string {
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

    override get hypervisor(): hypervisor.Hypervisor {
      return new hypervisor.Qemu()
    }

    override get efiHypervisor(): hypervisor.Hypervisor {
      return new hypervisor.QemuEfi()
    }

    override validateHypervisor(kind: hypervisor.Kind): void {
      switch (kind) {
        case hypervisor.Kind.qemu:
          break
        case hypervisor.Kind.xhyve:
          throw new Error(
            'Unsupported hypervisor for architecture ARM64: xhyve'
          )
        default:
          throw new Error(`Internal Error: Unhandled hypervisor kind: ${kind}`)
      }
    }
  }

  private static readonly X86_64 = class extends Architecture {
    override get name(): string {
      return 'x86-64'
    }

    override get resolveName(): string {
      return 'x86_64'
    }

    override get resourceUrl(): string {
      return `${this.resourceBaseUrl}/qemu-system-x86_64-${this.hostString}.tar`
    }

    override get cpu(): string {
      return this.hostQemu.cpu
    }

    override get machineType(): string {
      return 'q35'
    }

    override get accelerator(): vm.Accelerator {
      return this.hostQemu.accelerator
    }

    override get hypervisor(): hypervisor.Hypervisor {
      return this.selectedHypervisor
    }

    override get efiHypervisor(): hypervisor.Hypervisor {
      return this.host.efiHypervisor
    }
  }

  private static readonly X86_64OpenBsd = class extends this.X86_64 {
    override get networkDevice(): string {
      return 'e1000'
    }
  }

  private static readonly Arm64OpenBsd = class extends this.Arm64 {
    override get efiHypervisor(): hypervisor.Hypervisor {
      return new Architecture.Arm64OpenBsd.QemuEfi()
    }

    private static readonly QemuEfi = class extends hypervisor.QemuEfi {
      override get firmwareFile(): string {
        return `${this.firmwareDirectory}/linaro_uefi.fd`
      }
    }
  }

  private static readonly architectureMap: ReadonlyMap<
    Kind,
    typeof Architecture.X86_64
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
  x86_64: Kind.x86_64,
  x64: Kind.x86_64
} as const
