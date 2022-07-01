export abstract class Hypervisor {
  abstract get sshPort(): number
}

export class Xhyve extends Hypervisor {
  override get sshPort(): number {
    return 22
  }
}

export class Qemu extends Hypervisor {
  get sshPort(): number {
    return 2847
  }
}
