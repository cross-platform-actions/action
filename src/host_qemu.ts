import {Accelerator} from './vm'

// Contains host specific QEMU properties
export default abstract class HostQemu {
  abstract get cpu(): string
  abstract get accelerator(): Accelerator

  static readonly LinuxHostQemu = class extends HostQemu {
    override get accelerator(): Accelerator {
      return Accelerator.tcg
    }

    override get cpu(): string {
      return 'max'
    }
  }

  static readonly MacosHostQemu = class extends HostQemu {
    override get accelerator(): Accelerator {
      return Accelerator.hvf
    }

    override get cpu(): string {
      return 'max'
    }
  }
}
