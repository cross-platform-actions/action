import * as fs from 'fs'
import * as vm from './vm'

export abstract class Vm extends vm.Vm {
  static readonly sshPort = 2847

  constructor(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    configuration: vm.Configuration
  ) {
    super(hypervisorDirectory, resourcesDirectory, 'qemu', configuration)
  }

  protected override async getIpAddress(): Promise<string> {
    return 'localhost'
  }

  override get command(): string[] {
    const accel = vm.Accelerator[this.configuration.accelerator]

    // prettier-ignore
    return [
      this.hypervisorPath.toString(),
      '-machine', `type=${this.configuration.machineType},accel=${accel}`,
      '-cpu', this.configuration.cpu,
      '-smp', `cpus=${this.configuration.cpuCount},sockets=${this.configuration.cpuCount}`,
      '-m', this.configuration.memory,
      
      '-device', 'virtio-scsi-pci',
      '-device', 'scsi-hd,drive=drive0,bootindex=0',
      '-drive', `if=none,file=${this.configuration.diskImage},id=drive0,cache=writeback,discard=ignore,format=raw`,
      '-device', 'scsi-hd,drive=drive1,bootindex=1',
      '-drive', `if=none,file=${this.configuration.resourcesDiskImage},id=drive1,cache=writeback,discard=ignore,format=raw`,

      '-device', 'virtio-net,netdev=user.0',
      '-netdev', `user,id=user.0,hostfwd=tcp::${this.configuration.ssHostPort}-:22`,

      '-display', 'none',
      '-monitor', 'none',
      
      '-boot', 'strict=off',
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      '-bios', this.configuration.firmware!.toString()
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
    ]
  }
}

export class FreeBsd extends Vm {
  protected override async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -p now')
  }
}

export class NetBsd extends Vm {
  protected override async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -h -p now')
  }
}

export class OpenBsd extends Vm {
  protected override async shutdown(): Promise<void> {
    await this.execute('sudo shutdown -h -p now')
  }
}
