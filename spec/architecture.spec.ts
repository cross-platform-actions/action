import * as architecture from '../src/architectures/kind'
import * as factory from '../src/architectures/factory'
import {Host} from '../src/host'
import * as os from '../src/operating_systems/kind'
import {Qemu, QemuEfi, Simh} from '../src/hypervisor'
import '../src/operating_systems/freebsd/freebsd'
import '../src/operating_systems/netbsd/netbsd'

let context = describe

describe('Architecture', () => {
  describe('efiHypervisor', () => {
    context('x86_64', () => {
      let kind = architecture.Kind.x86_64

      context('Linux host', () => {
        let host = Host.create('linux')

        context('QEMU hypervisor', () => {
          let selectedHypervisor = new Qemu()

          context('OpenBSD', () => {
            let osKind = os.Kind.for('openbsd')
            let arch = factory.create(kind, host, osKind, selectedHypervisor)

            it('returns the QEMU EFI hypervisor', () => {
              expect(arch.efiHypervisor).toBeInstanceOf(QemuEfi)
            })
          })
        })
      })
    })
  })

  describe('hypervisor', () => {
    context('vax', () => {
      let kind = architecture.Kind.vax

      context('Linux host', () => {
        let host = Host.create('linux')

        context('NetBSD', () => {
          let osKind = os.Kind.for('netbsd')
          let arch = factory.create(kind, host, osKind, host.hypervisor)

          it('returns the SIMH hypervisor', () => {
            expect(arch.hypervisor).toBeInstanceOf(Simh)
          })

          it('uses "vax" as the architecture name', () => {
            expect(arch.name).toEqual('vax')
          })

          it('downloads the simulator from the simh-builder releases', () => {
            expect(arch.resourceUrl).toMatch(
              /^https:\/\/github.com\/cross-platform-actions\/simh-builder\/releases\/download\/v[^/]+\/vax-linux-(x86-64|arm64).tar$/
            )
          })
        })

        context('operating systems other than NetBSD', () => {
          let osKind = os.Kind.for('openbsd')

          it('throws an error', () => {
            expect(() =>
              factory.create(kind, host, osKind, host.hypervisor)
            ).toThrowError(/^The vax architecture is only supported on NetBSD/)
          })
        })
      })
    })

    context('x86_64', () => {
      let kind = architecture.Kind.x86_64

      context('Linux host', () => {
        let host = Host.create('linux')

        context('QEMU hypervisor', () => {
          let selectedHypervisor = new Qemu()

          context('OpenBSD', () => {
            let osKind = os.Kind.for('openbsd')
            let arch = factory.create(kind, host, osKind, selectedHypervisor)

            it('returns the QEMU EFI hypervisor', () => {
              expect(arch.hypervisor).toBeInstanceOf(Qemu)
            })
          })
        })
      })
    })
  })
})

describe('toKind', () => {
  describe('arm64', () => {
    it('returns the arm64 architecture', () => {
      expect(architecture.toKind('arm64')).toBe(architecture.Kind.arm64)
    })
  })

  describe('ARM64', () => {
    it('returns the arm64 architecture', () => {
      expect(architecture.toKind('ARM64')).toBe(architecture.Kind.arm64)
    })
  })

  describe('vax', () => {
    it('returns the vax architecture', () => {
      expect(architecture.toKind('vax')).toBe(architecture.Kind.vax)
    })
  })

  describe('VAX', () => {
    it('returns the vax architecture', () => {
      expect(architecture.toKind('VAX')).toBe(architecture.Kind.vax)
    })
  })

  describe('x86-64', () => {
    it('returns the x86_64 architecture', () => {
      expect(architecture.toKind('x86-64')).toBe(architecture.Kind.x86_64)
    })
  })

  describe('x86_64', () => {
    it('returns the x86_64 architecture', () => {
      expect(architecture.toKind('x86_64')).toBe(architecture.Kind.x86_64)
    })
  })

  describe('X64', () => {
    it('returns the x86_64 architecture', () => {
      expect(architecture.toKind('x64')).toBe(architecture.Kind.x86_64)
    })
  })

  describe('X86_64', () => {
    it('returns the x86_64 architecture', () => {
      expect(architecture.toKind('X86_64')).toBe(architecture.Kind.x86_64)
    })
  })

  describe('riscv64', () => {
    it('returns the riscv64 architecture', () => {
      expect(architecture.toKind('riscv64')).toBe(architecture.Kind.riscv64)
    })
  })

  describe('riscv', () => {
    it('returns the riscv64 architecture', () => {
      expect(architecture.toKind('riscv')).toBe(architecture.Kind.riscv64)
    })
  })

  describe('rv64', () => {
    it('returns the riscv64 architecture', () => {
      expect(architecture.toKind('rv64')).toBe(architecture.Kind.riscv64)
    })
  })

  describe('invalid architecture', () => {
    it('returns undefined', () => {
      expect(architecture.toKind('null')).toBeUndefined()
    })
  })
})

describe('Architecture riscv64', () => {
  let host = Host.create('linux')
  let osKind = os.Kind.for('freebsd')
  let arch = factory.create(architecture.Kind.riscv64, host, osKind, new Qemu())

  it('has the name riscv64', () => {
    expect(arch.name).toEqual('riscv64')
  })

  it('uses the rv64 CPU', () => {
    expect(arch.cpu).toEqual('rv64')
  })

  it('uses the virt machine type', () => {
    expect(arch.machineType).toEqual('virt')
  })

  it('downloads the riscv64 QEMU resource', () => {
    expect(arch.resourceUrl).toContain('qemu-system-riscv64-linux.tar')
  })

  it('uses U-Boot as the firmware', () => {
    expect(arch.hypervisor.firmwareFile).toContain('u-boot.bin')
  })
})

describe('Architecture arm64', () => {
  let host = Host.create('linux')

  context('FreeBSD', () => {
    let osKind = os.Kind.for('freebsd')
    let arch = factory.create(architecture.Kind.arm64, host, osKind, new Qemu())

    it('uses the virt machine type', () => {
      expect(arch.machineType).toEqual('virt')
    })
  })

  context('OpenBSD', () => {
    let osKind = os.Kind.for('openbsd')
    let arch = factory.create(architecture.Kind.arm64, host, osKind, new Qemu())

    it('uses the virt machine type with ACPI disabled', () => {
      expect(arch.machineType).toEqual('virt,acpi=off')
    })

    it('uses the default EFI firmware', () => {
      expect(arch.efiHypervisor.firmwareFile).toContain('uefi.fd')
      expect(arch.efiHypervisor.firmwareFile).not.toContain('linaro')
    })
  })
})
