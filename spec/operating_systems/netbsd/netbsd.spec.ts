import NetBsd from '../../../src/operating_systems/netbsd/netbsd'
import NetBsdVax from '../../../src/operating_systems/netbsd/vax'
import * as hostModule from '../../../src/host'
import * as arch from '../../../src/architectures/factory'
import * as archKind from '../../../src/architectures/kind'
import * as os from '../../../src/operating_systems/kind'
import HostQemu from '../../../src/host_qemu'
import * as hypervisor from '../../../src/hypervisor'
import * as qemu from '../../../src/qemu_vm'
import * as netbsdQemuVm from '../../../src/operating_systems/netbsd/qemu_vm'
import * as netbsdVaxVm from '../../../src/operating_systems/netbsd/vax_vm'
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
  let architecture = arch.create(
    archKind.Kind.x86_64,
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

    describe('VAX architecture', () => {
      let vaxArchitecture = arch.create(
        archKind.Kind.vax,
        host,
        osKind,
        host.hypervisor
      )
      let netbsdVax = new NetBsdVax(vaxArchitecture, '0.0.0')

      it('does not require an SSH key', () => {
        expect(netbsdVax.requiresSshKey).toBe(false)
      })

      // The base class derives the name from the class name, which would send
      // the download to a `netbsdvax-builder` repository that doesn't exist.
      it('downloads its image from the NetBSD builder', () => {
        expect(netbsdVax.virtualMachineImageUrl).toEqual(
          'https://github.com/cross-platform-actions/netbsd-builder/releases/' +
            `download/${netbsdVax.virtualMachineImageReleaseVersion}/` +
            'netbsd-0.0.0-vax.img.zst'
        )
      })

      it('creates a SIMH virtual machine', () => {
        let vaxVmSpy = spyOn(netbsdVaxVm, 'Vm')

        netbsdVax.createVirtualMachine(
          hypervisorDirectory,
          resourcesDirectory,
          firmwareDirectory,
          input,
          config
        )

        expect(vaxVmSpy).toHaveBeenCalledOnceWith(
          hypervisorDirectory,
          resourcesDirectory,
          vaxArchitecture,
          input,
          {
            ...config,
            ssHostPort: 2847,
            cpu: 'ka655x',
            machineType: 'microvax3900',
            firmware: firmwareDirectory
          }
        )
      })
    })
  })
})
