import {Vm} from '../../qemu_vm'

export class QemuVm extends Vm {
  protected get hardDriverFlags(): string[] {
    return this.defaultHardDriveFlags
  }

  protected override get netDevive(): string {
    return this.architecture.networkDevice
  }

  protected override get accelerators(): string[] {
    return this.input.version.startsWith('6')
      ? ['hvf', 'tcg'] // KVM doesn't work with versions older than 7.0
      : ['hvf', 'kvm', 'tcg']
  }
}

export class QemuVmX86_64 extends QemuVm {
  protected override get cpuidFlags(): string[] {
    // disable huge pages, otherwise OpenBSD will not boot: https://gitlab.com/qemu-project/qemu/-/issues/1091
    return ['-pdpe1gb']
  }

  protected override get firmwareFlags(): string[] {
    return [
      '-drive',
      `if=pflash,format=raw,unit=0,file=${this.configuration.firmware},readonly=on`
    ]
  }
}
