import {basename} from 'path'

import FreeBsd from '../../../src/operating_systems/freebsd/freebsd'
import hostModule from '../../../src/host'
import * as arch from '../../../src/architecture'
import * as os from '../../../src/operating_systems/kind'
import * as hypervisor from '../../../src/hypervisor'
import {Input} from '../../../src/action/input'
import {Host} from '../../../src/host'

describe('FreeBSD OperatingSystem', () => {
  let host = Host.create('linux')
  let osKind = os.Kind.for('freebsd')
  let vmm = host.hypervisor
  let architecture = arch.Architecture.for(arch.Kind.x86_64, host, osKind, vmm)
  let freebsd = new FreeBsd(architecture, '0.0.0')
  let hypervisorDirectory = 'hypervisor/directory'
  let resourcesDirectory = 'resources/directory'
  let firmwareDirectory = 'firmware/directory'
  let input = new Input()

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
      spyOnProperty(hostModule, 'host').and.returnValue(host)
    })

    it('creates a virtual machine with the correct configuration', () => {
      spyOn(vmm, 'resolve').and.returnValue(vmModule)

      freebsd.createVirtualMachine(
        hypervisorDirectory,
        resourcesDirectory,
        firmwareDirectory,
        input,
        config
      )

      expect(vmModule).toHaveBeenCalledOnceWith(
        hypervisorDirectory,
        resourcesDirectory,
        architecture,
        input,
        {
          ...config,
          ssHostPort: 2847,
          cpu: 'max',
          machineType: 'q35',
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
          input,
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
          input,
          config
        )

        const hypervisorBinary = basename(vm.hypervisorPath.toString())
        expect(hypervisorBinary).toEqual('qemu')
      })
    })
  })
})
