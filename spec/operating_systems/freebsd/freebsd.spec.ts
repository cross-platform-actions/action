import {basename} from 'path'

import FreeBsd from '../../../src/operating_systems/freebsd/freebsd'
import hostModule from '../../../src/host'
import * as arch from '../../../src/architecture'
import * as os from '../../../src/operating_systems/kind'
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
  let input = new Input(host)

  let config = {
    memory: '4G',
    cpuCount: 7,
    diskImage: '',
    resourcesDiskImage: ''
  }

  describe('createVirtualMachine', () => {
    beforeEach(() => {
      spyOnProperty(hostModule, 'host').and.returnValue(host)
    })

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
  })
})
