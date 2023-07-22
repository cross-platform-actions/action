import {basename} from 'path'

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

    override validateHypervisor(_kind: hypervisor.Kind): void {}
  }

  let host = new MockHost()
  let osKind = os.Kind.for('freebsd')
  let vmm = host.hypervisor
  let architecture = arch.Architecture.for(arch.Kind.x86_64, host, osKind, vmm)
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
    })

    it('creates a virtual machine with the correct configuration', () => {
      spyOn(vmm, 'resolve').and.returnValue(vmModule)

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

    describe('when the given hypervisor is Xhyve', () => {
      it('creates a virtual machine using the Xhyve hypervisor', () => {
        let archObject = arch.Architecture.for(
          arch.Kind.x86_64,
          host,
          osKind,
          new hypervisor.Xhyve()
        )
        let freebsd = new FreeBsd(archObject, '0.0.0')
        const vm = freebsd.createVirtualMachine(
          hypervisorDirectory,
          resourcesDirectory,
          firmwareDirectory,
          config
        )

        const hypervisorBinary = basename(vm.hypervisorPath.toString())
        expect(hypervisorBinary).toEqual('xhyve')
      })
    })

    describe('when the given hypervisor is Qemu', () => {
      it('creates a virtual machine using the Qemu hypervisor', () => {
        let archObject = arch.Architecture.for(
          arch.Kind.x86_64,
          host,
          osKind,
          new hypervisor.Qemu()
        )
        let freebsd = new FreeBsd(archObject, '0.0.0')
        const vm = freebsd.createVirtualMachine(
          hypervisorDirectory,
          resourcesDirectory,
          firmwareDirectory,
          config
        )

        const hypervisorBinary = basename(vm.hypervisorPath.toString())
        expect(hypervisorBinary).toEqual('qemu')
      })
    })
  })
})
