import {basename} from 'path'

import FreeBsd from '../../../src/operating_systems/freebsd/freebsd'
import {QemuVmRiscv64} from '../../../src/operating_systems/freebsd/qemu_vm'
import * as arch from '../../../src/architectures/factory'
import * as archKind from '../../../src/architectures/kind'
import * as os from '../../../src/operating_systems/kind'
import {Input} from '../../../src/action/input'
import {Host} from '../../../src/host'

describe('FreeBSD OperatingSystem', () => {
  let host = Host.create('linux')
  let osKind = os.Kind.for('freebsd')
  let vmm = host.hypervisor
  let architecture = arch.create(archKind.Kind.x86_64, host, osKind, vmm)
  let freebsd = new FreeBsd(architecture, '0.0.0')
  let hypervisorDirectory = 'hypervisor/directory'
  let resourcesDirectory = 'resources/directory'
  let firmwareDirectory = 'firmware/directory'
  let input = new Input(host)

  let config = {
    memory: '4G',
    cpuCount: 7,
    diskImage: '',
    resourcesDiskImage: ''
  }

  describe('createVirtualMachine', () => {
    it('creates a virtual machine with the correct configuration', () => {
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

    it('creates a riscv64 virtual machine that boots via U-Boot', () => {
      const riscv64 = arch.create(archKind.Kind.riscv64, host, osKind, vmm)
      const freebsdRiscv64 = new FreeBsd(riscv64, '15.0')

      const vm = freebsdRiscv64.createVirtualMachine(
        hypervisorDirectory,
        resourcesDirectory,
        firmwareDirectory,
        input,
        config
      )

      expect(vm).toBeInstanceOf(QemuVmRiscv64)
    })
  })
})
