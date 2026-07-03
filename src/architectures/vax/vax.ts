import * as process from 'process'

import {Architecture} from '../../architecture'
import * as hypervisor from '../../hypervisor'
import {ResourceUrls} from '../../operating_systems/resource_urls'
import versions from '../../version'

export class Vax extends Architecture {
  override get name(): string {
    return 'vax'
  }

  override get resolveName(): string {
    return 'vax'
  }

  override get resourceUrl(): string {
    const baseUrl = ResourceUrls.create().baseUrl
    const fileName = `vax-${this.hostString}-${this.hostArchitectureName}.tar`

    return [
      baseUrl,
      'simh-builder',
      'releases',
      'download',
      versions.simh,
      fileName
    ].join('/')
  }

  override get cpu(): string {
    return 'ka655x'
  }

  override get machineType(): string {
    return 'microvax3900'
  }

  override get hypervisor(): hypervisor.Hypervisor {
    return new hypervisor.Simh()
  }

  override get efiHypervisor(): hypervisor.Hypervisor {
    return new hypervisor.Simh()
  }

  override validateHypervisor(kind: hypervisor.Kind): void {
    switch (kind) {
      case hypervisor.Kind.simh:
        break
      default:
        throw new Error(`Internal Error: Unhandled hypervisor kind: ${kind}`)
    }
  }

  private get hostArchitectureName(): string {
    switch (process.arch) {
      case 'x64':
        return 'x86-64'
      case 'arm64':
        return 'arm64'
      default:
        throw Error(`Unsupported host architecture: ${process.arch}`)
    }
  }
}
