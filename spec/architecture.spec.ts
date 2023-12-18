import * as architecture from '../src/architecture'
import {Architecture} from '../src/architecture'
import {Host} from '../src/host'
import * as os from '../src/operating_systems/kind'
import {Qemu, QemuEfi, Xhyve} from '../src/hypervisor'

let context = describe

describe('Architecture', () => {
  describe('efiHypervisor', () => {
    context('x86_64', () => {
      let kind = architecture.Kind.x86_64

      context('macOS host', () => {
        let host = Host.create('darwin')

        context('QEMU hypervisor', () => {
          let selectedHypervisor = new Qemu()

          context('OpenBSD', () => {
            let osKind = os.Kind.for('openbsd')
            let arch = Architecture.for(kind, host, osKind, selectedHypervisor)

            it('returns the QEMU EFI hypervisor', () => {
              expect(arch.efiHypervisor).toBeInstanceOf(QemuEfi)
            })
          })
        })

        context('Xhyve hypervisor', () => {
          let selectedHypervisor = new Xhyve()

          context('OpenBSD', () => {
            let osKind = os.Kind.for('openbsd')
            let arch = Architecture.for(kind, host, osKind, selectedHypervisor)

            it('returns the Xhyve hypervisor', () => {
              expect(arch.efiHypervisor).toBeInstanceOf(Xhyve)
            })
          })
        })
      })

      context('Linux host', () => {
        let host = Host.create('linux')

        context('QEMU hypervisor', () => {
          let selectedHypervisor = new Qemu()

          context('OpenBSD', () => {
            let osKind = os.Kind.for('openbsd')
            let arch = Architecture.for(kind, host, osKind, selectedHypervisor)

            it('returns the QEMU EFI hypervisor', () => {
              expect(arch.efiHypervisor).toBeInstanceOf(QemuEfi)
            })
          })
        })
      })
    })
  })

  describe('hypervisor', () => {
    context('x86_64', () => {
      let kind = architecture.Kind.x86_64

      context('macOS host', () => {
        let host = Host.create('darwin')

        context('QEMU hypervisor', () => {
          let selectedHypervisor = new Qemu()

          context('OpenBSD', () => {
            let osKind = os.Kind.for('openbsd')
            let arch = Architecture.for(kind, host, osKind, selectedHypervisor)

            it('returns the QEMU EFI hypervisor', () => {
              expect(arch.hypervisor).toBeInstanceOf(Qemu)
            })
          })
        })

        context('Xhyve hypervisor', () => {
          let selectedHypervisor = new Xhyve()

          context('OpenBSD', () => {
            let osKind = os.Kind.for('openbsd')
            let arch = Architecture.for(kind, host, osKind, selectedHypervisor)

            it('returns the Xhyve hypervisor', () => {
              expect(arch.hypervisor).toBeInstanceOf(Xhyve)
            })
          })
        })
      })

      context('Linux host', () => {
        let host = Host.create('linux')

        context('QEMU hypervisor', () => {
          let selectedHypervisor = new Qemu()

          context('OpenBSD', () => {
            let osKind = os.Kind.for('openbsd')
            let arch = Architecture.for(kind, host, osKind, selectedHypervisor)

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

  describe('invalid architecture', () => {
    it('returns undefined', () => {
      expect(architecture.toKind('null')).toBeUndefined()
    })
  })
})
