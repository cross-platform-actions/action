import {operatingSystem} from '../factory'
import versions from '../../version'
import {Qemu} from '../qemu'
import * as qemu_vm from './qemu_vm'
import {Class} from '../../utility'
import {Vm as QemuVm} from '../../qemu_vm'

@operatingSystem
export default class OpenIndiana extends Qemu {
  get virtualMachineImageReleaseVersion(): string {
    return versions.operating_system.openindiana
  }

  get vmClass(): Class<QemuVm> {
    return qemu_vm.Vm
  }

  // Distributed as a bundle, like NetBSD's images, because a solid zstd stream
  // downloads faster than qcow2's own compression.
  protected override get imageFileExtension(): string {
    return OpenIndiana.bundleFileExtension
  }

  // The images let `runner` in with an empty password, so there's no key to
  // deliver and no resources disk to carry it on.
  override get requiresSshKey(): boolean {
    return false
  }
}
