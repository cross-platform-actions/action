import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import NetBsd from './netbsd'
import * as vax_vm from './vax_vm'
import {Class} from '../../utility'
import * as vm from '../../vm'
import {Hypervisor, Simh as SimhHypervisor} from '../../hypervisor'

// NetBSD on the VAX architecture. Unlike the other architectures it runs on
// the SIMH simulator instead of QEMU, which drives every difference below.
export default class NetBsdVax extends NetBsd {
  override get vmClass(): Class<vm.Vm> {
    return vax_vm.Vm
  }

  override get hypervisor(): Hypervisor {
    return new SimhHypervisor()
  }

  // The emulated VAX boots much slower than the QEMU based VMs: booting to a
  // reachable sshd takes roughly 15 minutes even though the image ships with
  // pre-generated SSH host keys. Allow a generous margin for slower or
  // emulated runners (the builder's own CI waits up to ~40 minutes).
  override get sshReadyTimeout(): number {
    return 2400
  }

  // NetBSD VAX has no working msdosfs, so the resources disk that carries the
  // generated SSH key can't be mounted. The image gives its user an empty
  // password instead, which needs nothing from this end: sshd's
  // keyboard-interactive method accepts it without sending a prompt.
  override get requiresSshKey(): boolean {
    return false
  }

  // The KA655 firmware self-test is unreliable when the machine is restarted
  // inside the same simulator process, so reboot isn't supported on VAX.
  override get supportsReboot(): boolean {
    return false
  }

  // The VAX image is a raw SIMH disk compressed with zstd, the other
  // architectures use qcow2.
  protected override get imageFileExtension(): string {
    return 'img.zst'
  }

  // The VAX image is already a raw SIMH disk, just zstd compressed, so
  // decompress it directly instead of converting from qcow2. zstd was told to
  // use a 128 MiB window (its default decompression limit), so no `--long`
  // flag is needed here.
  override async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    core.debug('Decompressing raw disk image')
    const target = path.join(
      resourcesDirectory.toString(),
      targetDiskName.toString()
    )

    await exec.exec('zstd', ['-d', '-f', diskImage.toString(), '-o', target])
  }
}
