import {Host} from './host'
import {Accelerator} from './vm'

// Contains host specific QEMU properties
export default abstract class HostQemu {
  static for(host: Host): HostQemu {
    const cls = host.resolve({
      macos: this.MacosHostQemu,
      linux: this.LinuxHostQemu
    })

    return new cls()
  }

  abstract get cpu(): string
  abstract get accelerator(): Accelerator

  private static readonly LinuxHostQemu = class extends HostQemu {
    override get accelerator(): Accelerator {
      return Accelerator.tcg
    }

    override get cpu(): string {
      return 'qemu64'
    }
  }

  private static readonly MacosHostQemu = class extends HostQemu {
    override get accelerator(): Accelerator {
      return Accelerator.hvf
    }

    override get cpu(): string {
      return 'host'
    }
  }
}
