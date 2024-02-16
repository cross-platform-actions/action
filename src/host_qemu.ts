// Contains host specific QEMU properties
export default abstract class HostQemu {
  abstract get cpu(): string

  static readonly LinuxHostQemu = class extends HostQemu {
    override get cpu(): string {
      return 'max'
    }
  }

  static readonly MacosHostQemu = class extends HostQemu {
    override get cpu(): string {
      return 'max'
    }
  }
}
