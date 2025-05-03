import {Vm as QemuVm} from '../../qemu_vm'

export class Vm extends QemuVm {
  override async setupWorkDirectory(
    homeDirectory: string,
    workDirectory: string
  ): Promise<void> {
    await this.execute(
      `mkdir -p '${workDirectory}' && ` +
        `ln -sf '/boot/home/' '${homeDirectory}'`
    )
  }

  protected get hardDriverFlags(): string[] {
    return this.defaultHardDriveFlags
  }

  protected override get ipv6(): string {
    return 'ipv6=off'
  }

  protected override get netDevive(): string {
    return 'e1000'
  }

  protected override get user(): string {
    return 'user'
  }
}
