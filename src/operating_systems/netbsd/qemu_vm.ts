import * as fs from 'fs'

import {Vm as QemuVm} from '../../qemu_vm'
import {Configuration} from '../../vm'

// Booting the way every other platform does: the firmware reads a boot loader
// off the disk, which reads the kernel.
export class Vm extends QemuVm {
  // The images this action publishes accept a login with no credential, so
  // there's no key to hand over and no resources disk to carry it on. A custom
  // image may still expect one, in which case the action built it -- see
  // Action.requiresSshKey -- so attach it when it's there.
  protected get hardDriverFlags(): string[] {
    // prettier-ignore
    return [
      '-device', 'virtio-scsi-pci',
      '-device', 'scsi-hd,drive=drive0,bootindex=0',
      '-drive', this.drive,
      ...this.resourcesDriveFlags
    ]
  }

  private get resourcesDriveFlags(): string[] {
    const disk = this.configuration.resourcesDiskImage.toString()
    if (!exists(disk)) return []

    // prettier-ignore
    return [
      '-device', 'scsi-hd,drive=drive1,bootindex=1',
      '-drive', `if=none,file=${disk},id=drive1,cache=unsafe,discard=ignore,format=raw`
    ]
  }

  protected get drive(): string {
    const disk = this.configuration.diskImage.toString()

    return `if=none,file=${disk},id=drive0,cache=unsafe,discard=ignore,format=raw`
  }

  protected override get ipv6(): string {
    return 'ipv6=off'
  }
}

// QEMU's `microvm` machine type: no boot loader, no PCI bus and no ACPI, which
// together are the few seconds a guest otherwise spends before init runs.
//
// Selected by `variant: microvm` rather than by what happens to be on disk, so
// it changes the guest's hardware only for a job that asked for it.
export class MicrovmVm extends Vm {
  // Both files are looked for rather than derived from versions: an image built
  // before NetBSD had a MICROVM kernel configuration, or for an architecture
  // that doesn't, carries no kernel, and a hypervisor archive built before this
  // needed it carries no qboot.
  //
  // Throws rather than falling back, because the variant was asked for: a job
  // that silently booted the other way would be slower for reasons its author
  // has no way to see.
  static validate(configuration: Configuration): void {
    const missing = [
      exists(configuration.kernel) ? '' : 'the image bundle carries no kernel',
      exists(configuration.microvmFirmware)
        ? ''
        : 'the hypervisor archive carries no microvm firmware (qboot)'
    ].filter(reason => reason !== '')

    if (missing.length === 0) return

    throw Error(
      `The 'microvm' variant cannot be booted: ${missing.join(' and ')}. ` +
        'Use a newer image version, or drop the variant to boot through the ' +
        'firmware.'
    )
  }

  // acpi and the 8259 are off because the MICROVM kernel expects them to be: it
  // configures CPUs from the MP table instead. The RTC stays on, because it's
  // where the guest gets the time from -- nothing sets the clock at boot.
  protected override get machineType(): string {
    return 'microvm,acpi=off,pic=off,rtc=on,x-option-roms=off'
  }

  // `root=dk0` because the root file system is a GPT wedge, so its name doesn't
  // change with the driver the disk arrives on. Deliberately no `-z`: it would
  // quiet the boot messages the post job step prints when a VM fails to boot.
  //
  // qboot rather than the SeaBIOS the parent passes, because here the firmware
  // is what loads the kernel, and what leaves behind the MP table -- the only
  // place a guest with no ACPI can read CPUs and interrupt routing from.
  // SeaBIOS boots nothing on this machine type and says nothing about why.
  protected override get firmwareFlags(): string[] {
    // prettier-ignore
    return [
      '-bios', this.microvmFirmware,
      '-kernel', this.kernel,
      '-append', 'root=dk0 console=com rw'
    ]
  }

  // There is no PCI bus, so virtio arrives over MMIO instead.
  protected override get hardDriverFlags(): string[] {
    // prettier-ignore
    return [
      '-device', 'virtio-blk-device,drive=drive0',
      '-drive', this.drive
    ]
  }

  // Same as the disk: MMIO rather than PCI, so there's no PCI address to give
  // it either.
  protected override get networkFlags(): string[] {
    // prettier-ignore
    return [
      '-device', 'virtio-net-device,netdev=user.0',
      '-netdev', this.netdev
    ]
  }

  // Decides what the guest uses to tell the time. NetBSD won't pick a TSC that
  // isn't advertised as invariant, and this machine type has no HPET to settle
  // for either, so it falls back to the i8254 -- two port reads, each of which
  // leaves the guest. An ssh transfer measured 15 MB/s that way, 40 with the TSC.
  protected override get cpuidFlags(): string[] {
    return ['+invtsc']
  }

  // Modern virtio rather than the legacy MMIO layout QEMU defaults to.
  protected override get extraFlags(): string[] {
    return ['-global', 'virtio-mmio.force-legacy=false']
  }

  // Both are known to be there: `validate` runs before this class is used.
  private get kernel(): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.configuration.kernel!.toString()
  }

  private get microvmFirmware(): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.configuration.microvmFirmware!.toString()
  }
}

function exists(file: fs.PathLike | undefined): boolean {
  return file !== undefined && fs.existsSync(file)
}
