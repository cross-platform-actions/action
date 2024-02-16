import * as fs from 'fs'
import * as architecture from './architecture'
import {getOrDefaultOrThrow} from './utility'
import * as vm from './vm'
import {Input} from './action/input'

export abstract class Vm extends vm.Vm {
  static readonly sshPort = 2847

  constructor(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    architecture: architecture.Architecture,
    input: Input,
    configuration: vm.Configuration
  ) {
    super(
      hypervisorDirectory,
      resourcesDirectory,
      'qemu',
      architecture,
      input,
      configuration
    )
  }

  protected override async getIpAddress(): Promise<string> {
    return 'localhost'
  }

  override get command(): string[] {
    const accelerators = this.accelerators.join(':')

    // prettier-ignore
    return [
      this.hypervisorPath.toString(),
      '-daemonize',
      '-machine', `type=${this.configuration.machineType},accel=${accelerators}`,
      '-cpu', this.cpuFlagValue,
      '-smp', this.configuration.cpuCount.toString(),
      '-m', this.configuration.memory,

      '-device', `${this.netDevive},netdev=user.0`,
      '-netdev', this.netdev,

      '-display', 'none',
      '-monitor', 'none',
      '-serial', `file:${this.logFile}`,
      // '-nographic',

      '-boot', 'strict=off',
      ...this.firmwareFlags,
      ...this.hardDriverFlags
    ]
  }

  protected abstract get hardDriverFlags(): string[]

  protected get defaultHardDriveFlags(): string[] {
    // prettier-ignore
    return [
      '-device', 'virtio-scsi-pci',

      '-device', 'scsi-hd,drive=drive0,bootindex=0',
      '-drive', `if=none,file=${this.configuration.diskImage},id=drive0,cache=unsafe,discard=ignore,format=raw`,

      '-device', 'scsi-hd,drive=drive1,bootindex=1',
      '-drive', `if=none,file=${this.configuration.resourcesDiskImage},id=drive1,cache=unsafe,discard=ignore,format=raw`,
    ]
  }

  protected get netDevive(): string {
    return 'virtio-net'
  }

  protected get ipv6(): string {
    return ''
  }

  protected get cpuidFlags(): string[] {
    return []
  }

  protected get firmwareFlags(): string[] {
    return ['-bios', this.configuration.firmware!.toString()]
  }

  protected get accelerators(): string[] {
    return ['hvf', 'kvm', 'tcg']
  }

  private get netdev(): string {
    return [
      'user',
      'id=user.0',
      `hostfwd=tcp::${this.configuration.ssHostPort}-:22`,
      this.ipv6
    ]
      .filter(e => e !== '')
      .join(',')
  }

  private get cpuFlagValue(): string {
    return [this.configuration.cpu, ...this.cpuidFlags].join(',')
  }
}

export function resolve<T>(implementation: Record<string, T>): T {
  return getOrDefaultOrThrow(implementation, 'qemu')
}
