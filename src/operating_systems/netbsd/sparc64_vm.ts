import * as qemu_vm from './qemu_vm'
import {mebibytes} from '../../utility'

// QEMU's `sun4u` machine, booted through its built-in OpenBIOS. The images run
// on the QEMU from the resources release, which carries a fix to the sun4u PCI
// bridge (sabre): upstream drops the IDE controller's interrupt when another
// PCI device raises one first, and the guest hangs under disk and network load.
export class Vm extends qemu_vm.Vm {
  // sun4u cannot address 4 GiB or more: OpenBIOS faults at 6 GiB and the NetBSD
  // kernel panics ("Can't claim two pages of memory") at 4 GiB. The action's
  // default is 6 GiB, so clamp to a value that reliably boots.
  private static readonly maxMemoryMebibytes = 3072

  // sun4u has no virtio-scsi; the disks attach to the on-board IDE controller,
  // which is also where OpenBIOS's `disk` alias points.
  protected override get systemDiskFlags(): string[] {
    return ['-drive', ideDrive(this.configuration.diskImage.toString(), 0)]
  }

  protected override resourcesDiskFlags(disk: string): string[] {
    return ['-drive', ideDrive(disk, 1)]
  }

  // The root bus and busA have masked slots, and the on-board NIC's FCode traps
  // OpenBIOS at boot; pciB is the only place a NIC works.
  protected override get networkFlags(): string[] {
    // prettier-ignore
    return [
      '-device', `${this.architecture.networkDevice},bus=pciB,netdev=user.0`,
      '-netdev', this.netdev
    ]
  }

  // OpenBIOS does not boot the disk by itself with `strict=off`.
  protected override get bootFlags(): string[] {
    return ['-boot', 'c']
  }

  // sun4u supports a single CPU only.
  protected override get smp(): string {
    return '1'
  }

  protected override get memory(): string {
    const requested = mebibytes(this.configuration.memory)

    if (requested === undefined || requested <= Vm.maxMemoryMebibytes)
      return this.configuration.memory

    return `${Vm.maxMemoryMebibytes}M`
  }
}

function ideDrive(file: string, index: number): string {
  return `file=${file},if=ide,index=${index},media=disk,format=raw,cache=unsafe,discard=ignore`
}
