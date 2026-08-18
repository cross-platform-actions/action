import * as fs from 'fs'
import * as path from 'path'
import type {StdioOptions} from 'child_process'

import * as core from '@actions/core'

import * as vm from './vm'

export abstract class Vm extends vm.Vm {
  protected static readonly consolePort = 2848

  // SCP messages (attach errors etc.) end up here. The simulated machine's
  // console output goes to `logFile`, like the QEMU serial console.
  private readonly simulatorLogFile = '/tmp/cross-platform-actions-simh.log'

  override async init(): Promise<void> {
    await super.init()
    const configuration = this.configurationFile
    core.debug(`SIMH configuration:\n${configuration}`)
    fs.writeFileSync(this.configurationFilePath, configuration)
  }

  override get command(): string[] {
    return [this.hypervisorPath.toString(), this.configurationFilePath]
  }

  get configurationFilePath(): string {
    return path.join(this.resourcesDirectory.toString(), 'simh.ini')
  }

  get configurationFile(): string {
    const commands = [
      ...this.consoleCommands,
      ...this.machineCommands,
      ...this.bootCommands
    ]

    return `${commands.join('\n')}\n`
  }

  protected override async getIpAddress(): Promise<string> {
    return 'localhost'
  }

  // The simulated machine runs at roughly 1 MIPS, where even the SSH
  // identification string exchange isn't necessarily prompt. Keep the longer
  // timeout a probe used to get, rather than risk a probe that times out
  // against a guest that is in fact listening.
  protected override get readinessProbeTimeout(): number {
    return 10
  }

  // SIMH cannot daemonize itself like QEMU. Redirect its output to a file
  // instead of inheriting the runner's pipes, otherwise the runner would
  // wait for the simulator to exit before finishing the step.
  protected override get stdio(): StdioOptions {
    const logFile = fs.openSync(this.simulatorLogFile, 'a')
    return ['ignore', logFile, logFile]
  }

  // Detach the console from stdio by exposing it via Telnet. `buffered`
  // lets the machine boot without a connected Telnet client.
  protected get consoleCommands(): string[] {
    return [
      `set console telnet=127.0.0.1:${Vm.consolePort}`,
      'set console telnet=buffered',
      `set console log=${Vm.logFile}`
    ]
  }

  protected get bootCommands(): string[] {
    return ['boot cpu', 'exit']
  }

  protected abstract get machineCommands(): string[]
}
