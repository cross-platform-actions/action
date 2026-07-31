import {Arm64} from './arm64'

export class Arm64OpenBsd extends Arm64 {
  // edk2 publishes ACPI tables; OpenBSD 7.x/arm64 hangs during ACPI attach.
  // Suppressing them makes the kernel fall back to the device tree.
  override get machineType(): string {
    return 'virt,acpi=off'
  }
}
