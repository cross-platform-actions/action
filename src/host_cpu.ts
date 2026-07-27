import * as os from 'os'

// Where the CPU information is read from. Node's `os` module satisfies this
// structurally, so no adapter is needed in production.
export interface CpuSource {
  cpus(): {model: string}[]
}

// The CPU of the host the action runs on. The hypervisor passes the host CPU
// through to the guest, so a guest that fails to boot on one runner but not on
// another can be correlated with the CPU it ran on.
export class HostCpu {
  private readonly source: CpuSource

  constructor(source: CpuSource = os) {
    this.source = source
  }

  toString(): string {
    const cpus = this.source.cpus()

    return `${this.model(cpus)} (${cpus.length} vCPUs)`
  }

  private model(cpus: {model: string}[]): string {
    const model = cpus.length === 0 ? '' : cpus[0].model.trim()

    return model === '' ? 'unknown' : model
  }
}
