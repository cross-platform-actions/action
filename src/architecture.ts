import {Host} from './host'
import * as hypervisor from './hypervisor'
import {ResourceUrls} from './operating_systems/resource_urls'
import {Kind} from './architectures/kind'
import {getOrDefaultOrThrow} from './utility'
import HostQemu from './host_qemu'

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

  abstract get name(): string
  abstract get resourceUrl(): string
  abstract get cpu(): string
  abstract get machineType(): string
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

  protected get internalHypervisor(): hypervisor.Hypervisor {
    return this.selectedHypervisor
  }
}
