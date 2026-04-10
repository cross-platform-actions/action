import NetBsd from '../../../src/operating_systems/netbsd/netbsd'
import * as hostModule from '../../../src/host'
import * as arch from '../../../src/architecture'
import * as os from '../../../src/operating_systems/kind'
import HostQemu from '../../../src/host_qemu'
import * as hypervisor from '../../../src/hypervisor'
import * as qemu from '../../../src/qemu_vm'
import * as netbsdQemuVm from '../../../src/operating_systems/netbsd/qemu_vm'
import {Input} from '../../../src/action/input'

describe('NetBSD OperatingSystem', () => {
  class Host extends hostModule.Host {
    get vmModule(): typeof qemu {
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

  let host = new Host()
  let osKind = os.Kind.for('netbsd')
  let architecture = arch.Architecture.for(
    arch.Kind.x86_64,
    host,
    osKind,
    host.hypervisor
  )
  let netbsd = new NetBsd(architecture, '0.0.0')
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
      let qemuVmSpy = spyOn(netbsdQemuVm, 'Vm')

      netbsd.createVirtualMachine(
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
          firmware: `${firmwareDirectory}/share/qemu/bios-256k.bin`
        }
      )
    })
  })
})
