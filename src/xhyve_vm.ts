import * as fs from 'fs'

import * as core from '@actions/core'

import * as vm from './vm'
import {execWithOutput} from './utility'
import {wait} from './wait'
import * as architecture from './architecture'
import {Input} from './action/input'

export abstract class Vm extends vm.Vm {
  static readonly sshPort = 22
  macAddress!: string

  constructor(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    architecture: architecture.Architecture,
    input: Input,
    configuration: vm.Configuration
  ) {
    super(
      hypervisorDirectory,
      resourcesDirectory,
      'xhyve',
      architecture,
      input,
      configuration
    )
  }

  override async init(): Promise<void> {
    super.init()
    this.macAddress = await this.getMacAddress()
  }

  protected override async getIpAddress(): Promise<string> {
    return getIpAddressFromArp(this.macAddress)
  }

  async getMacAddress(): Promise<string> {
    core.debug('Getting MAC address')
    this.macAddress = (
      await execWithOutput('sudo', this.command.concat('-M'), {
        silent: !core.isDebug()
      })
    )
      .trim()
      .slice(5)
    core.debug(`Found MAC address: '${this.macAddress}'`)
    return this.macAddress
  }

  /*override*/ get command(): string[] {
    const config = this.configuration

    // prettier-ignore
    return [
        this.hypervisorPath.toString(),
        '-U', config.uuid,
        '-A',
        '-H',
        '-m', config.memory,
        '-c', config.cpuCount.toString(),
        '-s', '0:0,hostbridge',
        '-s', `2:0,${this.networkDevice}`,
        '-s', `4:0,virtio-blk,${config.diskImage}`,
        '-s', `4:1,virtio-blk,${config.resourcesDiskImage}`,
        '-s', '31,lpc',
        '-l', 'com1,stdio'
      ]
  }

  protected abstract get networkDevice(): string
}

export function extractIpAddress(
  arpOutput: string,
  macAddress: string
): string | undefined {
  core.debug('Extracing IP address')
  const matchResult = arpOutput
    .split('\n')
    .find(e => e.includes(macAddress))
    ?.match(/\((.+)\)/)

  const ipAddress = matchResult ? matchResult[1] : undefined

  if (ipAddress !== undefined) core.info(`Found IP address: '${ipAddress}'`)

  return ipAddress
}

async function getIpAddressFromArp(macAddress: string): Promise<string> {
  core.info(`Getting IP address for MAC address: ${macAddress}`)
  for (let i = 0; i < 500; i++) {
    core.info('Waiting for IP to become available...')
    const arpOutput = await execWithOutput('arp', ['-a', '-n'], {silent: true})
    const ipAddress = extractIpAddress(arpOutput, macAddress)

    if (ipAddress !== undefined) return ipAddress

    await wait(1_000)
  }

  throw Error(`Failed to get IP address for MAC address: ${macAddress}`)
}
