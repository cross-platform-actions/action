import Haiku from '../../../src/operating_systems/haiku/haiku'
import * as hostModule from '../../../src/host'
import * as arch from '../../../src/architectures/factory'
import * as archKind from '../../../src/architectures/kind'
import * as os from '../../../src/operating_systems/kind'
import HostQemu from '../../../src/host_qemu'
import * as hypervisor from '../../../src/hypervisor'
import * as qemu from '../../../src/qemu_vm'
import * as xhyve from '../../../src/xhyve_vm'
import * as haikuQemuVm from '../../../src/operating_systems/haiku/qemu_vm'
import {Input} from '../../../src/action/input'

describe('Haiku OperatingSystem', () => {
  class Host extends hostModule.Host {
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

  let host = new Host()
  let osKind = os.Kind.for('haiku')
  let architecture = arch.Factory.for(
    archKind.Kind.x86_64,
    host,
    osKind,
    host.hypervisor
  )
  let haiku = new Haiku(architecture, '0.0.0')

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
    it('creates a virtual machine with the correct configuration', () => {
      let qemuVmSpy = spyOn(haikuQemuVm, 'Vm')

      haiku.createVirtualMachine(
        hypervisorDirectory,
        resourcesDirectory,
        firmwareDirectory,
        input,
        config
      )

      expect(qemuVmSpy).toHaveBeenCalledOnceWith(
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
  })
})
