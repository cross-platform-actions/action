import FreeBsd from '../../../src/operating_systems/freebsd/freebsd'
import * as hostModule from '../../../src/host'
import * as arch from '../../../src/architecture'
import * as os from '../../../src/operating_systems/kind'
import {Accelerator} from '../../../src/vm'
import HostQemu from '../../../src/host_qemu'
import * as hypervisor from '../../../src/hypervisor'
import * as qemu from '../../../src/qemu_vm'
import * as xhyve from '../../../src/xhyve_vm'

describe('FreeBSD OperatingSystem', () => {
  class MockHost extends hostModule.Host {
    get workDirectory(): string {
      return '/home/runner/work'
    }

    get vmModule(): typeof xhyve | typeof qemu {
      return qemu
    }

    override get qemu(): HostQemu {
      return new HostQemu.LinuxHostQemu()
    }

    override get hypervisor(): hypervisor.Hypervisor {
      return new hypervisor.Qemu()
    }

    override get efiHypervisor(): hypervisor.Hypervisor {
      return new hypervisor.QemuEfi()
    }

    override get defaultMemory(): string {
      return '6G'
    }

    override get defaultCpuCount(): number {
      return 6
    }
  }

  let host = new MockHost()
  let osKind = os.Kind.for('freebsd')
  let architecture = arch.Architecture.for(arch.Kind.x86_64, host, osKind)
  let freebsd = new FreeBsd(architecture, '0.0.0')
  let hypervisorDirectory = 'hypervisor/directory'
  let resourcesDirectory = 'resources/directory'
  let firmwareDirectory = 'firmware/directory'

  let config = {
    memory: '4G',
    cpuCount: 7,
    diskImage: '',
    resourcesDiskImage: '',
    userboot: ''
  }

  describe('createVirtualMachine', () => {
    let vmModule = jasmine.createSpy('vmModule')

    beforeEach(() => {
      spyOn(hostModule, 'getHost').and.returnValue(host)
      spyOn(host.vmModule, 'resolve').and.returnValue(vmModule)
    })

    it('creates a virtual machine with the correct configuration', () => {
      freebsd.createVirtualMachine(
        hypervisorDirectory,
        resourcesDirectory,
        firmwareDirectory,
        config
      )

      expect(vmModule).toHaveBeenCalledOnceWith(
        hypervisorDirectory,
        resourcesDirectory,
        architecture,
        {
          ...config,
          ssHostPort: 2847,
          cpu: 'qemu64',
          accelerator: Accelerator.tcg,
          machineType: 'pc',
          uuid: '864ED7F0-7876-4AA7-8511-816FABCFA87F',
          firmware: `${firmwareDirectory}/share/qemu/bios-256k.bin`
        }
      )
    })
  })
})
