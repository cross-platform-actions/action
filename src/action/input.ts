import * as core from '@actions/core'
import * as architecture from '../architecture'
import {Shell, toShell} from './shell'
import * as os from '../operating_systems/kind'
import {Host, host as defaultHost} from '../host'
import * as hypervisor from '../hypervisor'

export class Input {
  private readonly host: Host
  private run_?: string
  private operatingSystem_?: os.Kind
  private version_?: string
  private shell_?: Shell
  private environmentVariables_?: string
  private architecture_?: architecture.Kind
  private memory_?: string
  private cpuCount_?: number
  private hypervisor_?: hypervisor.Hypervisor

  constructor(host: Host = defaultHost) {
    this.host = host
  }

  get version(): string {
    if (this.version_ !== undefined) return this.version_
    return (this.version_ = core.getInput('version', {
      required: true
    }))
  }

  get operatingSystem(): os.Kind {
    if (this.operatingSystem_ !== undefined) return this.operatingSystem_
    const input = core.getInput('operating_system', {required: true})
    core.debug(`operating_system input: '${input}'`)

    return (this.operatingSystem_ = os.Kind.for(input))
  }

  get run(): string {
    if (this.run_ !== undefined) return this.run_
    return (this.run_ = core.getInput('run', {required: true}))
  }

  get shell(): Shell {
    if (this.shell_ !== undefined) return this.shell_
    const input = core.getInput('shell')
    const shell = input ? toShell(input) : Shell.default
    if (shell === undefined) throw Error(`Invalid shell: ${input}`)
    return (this.shell_ = shell)
  }

  get environmentVariables(): string {
    if (this.environmentVariables_ !== undefined)
      return this.environmentVariables_

    return (this.environmentVariables_ = core.getInput('environment_variables'))
  }

  get architecture(): architecture.Kind {
    if (this.architecture_ !== undefined) return this.architecture_

    const input = core.getInput('architecture')
    core.debug(`architecture input: '${input}'`)
    if (input === undefined || input === '')
      return (this.architecture_ = architecture.Kind.x86_64)

    const kind = architecture.toKind(input)
    core.debug(`kind: '${kind}'`)

    if (kind === undefined) throw Error(`Invalid architecture: ${input}`)

    return (this.architecture_ = kind)
  }

  get memory(): string {
    if (this.memory_ !== undefined) return this.memory_

    const memory = core.getInput('memory')
    core.debug(`memory input: '${memory}'`)
    if (memory === undefined || memory === '')
      return (this.memory_ = this.host.defaultMemory)

    return (this.memory_ = memory)
  }

  get cpuCount(): number {
    if (this.cpuCount_ !== undefined) return this.cpuCount_

    const cpuCount = core.getInput('cpu_count')
    core.debug(`cpuCount input: '${cpuCount}'`)
    if (cpuCount === undefined || cpuCount === '')
      return (this.cpuCount_ = this.host.defaultCpuCount)

    const parsedCpuCount = parseInt(cpuCount)

    if (Number.isNaN(parsedCpuCount))
      throw Error(`Invalid CPU count: ${cpuCount}`)

    return (this.cpuCount_ = parsedCpuCount)
  }

  get hypervisor(): hypervisor.Hypervisor {
    if (this.hypervisor_ !== undefined) return this.hypervisor_

    const input = core.getInput('hypervisor')
    core.debug(`hypervisor input: '${input}'`)
    if (input === undefined || input === '')
      return (this.hypervisor_ = this.host.hypervisor)

    const kind = hypervisor.toKind(input)
    core.debug(`kind: '${kind}'`)

    if (kind === undefined) throw Error(`Invalid hypervisor: ${input}`)

    const hypervisorClass = hypervisor.toHypervisor(kind)
    return (this.hypervisor_ = new hypervisorClass())
  }
}
