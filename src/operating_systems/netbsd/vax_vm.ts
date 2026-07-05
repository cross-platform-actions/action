import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'

import * as architecture from '../../architecture'
import * as simh_vm from '../../simh_vm'
import * as vm from '../../vm'
import {Input} from '../../action/input'
import {ExecExecutor, Executor} from '../../utility'

// The memory sizes, in megabytes, supported by the emulated
// MicroVAX 3900 (KA655/KA655X), largest first.
const supportedMemorySizes = [512, 256, 128, 64, 32, 16]

export class Vm extends simh_vm.Vm {
  constructor(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    arch: architecture.Architecture,
    input: Input,
    configuration: vm.Configuration,
    executor: Executor = new ExecExecutor()
  ) {
    super(
      hypervisorDirectory,
      resourcesDirectory,
      'vax',
      arch,
      input,
      configuration,
      executor
    )
  }

  // The KA655 firmware doesn't auto boot, it stops at the `>>>` console
  // prompt after the self-test. Drive it with a boot command for the
  // system disk (RQ0, which the firmware calls DUA0).
  protected override get bootCommands(): string[] {
    return ['expect ">>>" send "BOOT DUA0\\r"; continue', ...super.bootCommands]
  }

  protected get machineCommands(): string[] {
    const resources = this.resourcesDirectory.toString()
    const scratch1 = path.join(resources, 'scratch1.img')
    const scratch2 = path.join(resources, 'scratch2.img')

    // The disk image is a raw SIMH disk (RA92), which is SIMH's default
    // format, so no `set rq0 format` command is needed.
    return [
      `set cpu ${this.memory}`,
      'set cpu simhalt',
      'set cpu idle=NETBSD',
      'set rq0 ra92',
      `attach rq0 ${this.configuration.diskImage}`,
      // Two scratch disks (RQ1/RQ2) at the MSCP RAUSER maximum of 2047 MB
      // each — the largest a single VAX disk can be. The 1.5 GB root image
      // is far too small to fetch pkgsrc and build packages, so consumers
      // that need to (e.g. building binary packages) can newfs and mount
      // these for the tree and the build work directory. They're created
      // fresh — SIMH zero-fills them on attach — and cost nothing when
      // unused (sparse, never written). No resources disk is attached:
      // NetBSD VAX has no working msdosfs to mount it, and password
      // authentication means no key needs to be delivered.
      'set rq1 rauser=2047',
      `attach rq1 ${scratch1}`,
      'set rq2 rauser=2047',
      `attach rq2 ${scratch2}`,
      'set rq3 disable',
      `attach xq nat:tcp=${this.configuration.ssHostPort}:10.0.2.15:22`
    ]
  }

  private get memory(): string {
    const requested = this.memoryInMegaBytes
    const size = supportedMemorySizes.find(e => e <= requested)

    if (size === undefined) {
      throw Error(
        `Invalid memory: ${this.configuration.memory}. ` +
          'NetBSD VAX requires at least 16M of memory'
      )
    }

    if (size !== requested) {
      core.info(
        `Using ${size}M of memory, the largest size supported by the ` +
          `MicroVAX 3900 that fits within ${this.configuration.memory}`
      )
    }

    return `${size}M`
  }

  // Accepts the same shapes as QEMU's `-m` (used by the other
  // architectures): an integer or fractional number with an optional
  // k/m/g/t suffix, defaulting to megabytes.
  private get memoryInMegaBytes(): number {
    const memory = this.configuration.memory.trim()
    const match = /^(\d+(?:\.\d+)?)([kmgt]?)$/i.exec(memory)

    if (!match) throw Error(`Invalid memory: ${this.configuration.memory}`)

    const multipliers: Record<string, number> = {
      k: 1 / 1024,
      '': 1,
      m: 1,
      g: 1024,
      t: 1024 * 1024
    }

    return parseFloat(match[1]) * multipliers[match[2].toLowerCase()]
  }
}
