import OpenIndiana from '../../../src/operating_systems/openindiana/openindiana'
import * as hostModule from '../../../src/host'
import * as arch from '../../../src/architectures/factory'
import * as archKind from '../../../src/architectures/kind'
import * as os from '../../../src/operating_systems/kind'
import HostQemu from '../../../src/host_qemu'
import * as hypervisor from '../../../src/hypervisor'
import * as qemu from '../../../src/qemu_vm'
import * as openIndianaQemuVm from '../../../src/operating_systems/openindiana/qemu_vm'
import {Input} from '../../../src/action/input'

describe('OpenIndiana OperatingSystem', () => {
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
      return '4G'
    }

    override get defaultCpuCount(): number {
      return 4
    }
  }

  let host = new Host()
  let osKind = os.Kind.for('openindiana')
  let architecture = arch.create(
    archKind.Kind.x86_64,
    host,
    osKind,
    host.hypervisor
  )
  let openIndiana = new OpenIndiana(architecture, '2026.10.30')

  let hypervisorDirectory = 'hypervisor/directory'
  let resourcesDirectory = 'resources/directory'
  let firmwareDirectory = 'firmware/directory'
  let input = new Input(host)

  let config = {
    memory: '4G',
    cpuCount: 4,
    diskImage: '',
    resourcesDiskImage: ''
  }

  it('downloads a bundled image from the OpenIndiana builder', () => {
    expect(openIndiana.virtualMachineImageUrl).toEqual(
      'https://github.com/cross-platform-actions/openindiana-builder/' +
        `releases/download/${openIndiana.virtualMachineImageReleaseVersion}/` +
        'openindiana-2026.10.30-x86-64.tar.zst'
    )
  })

  it('does not require an SSH key', () => {
    expect(openIndiana.requiresSshKey).toBe(false)
  })

  describe('createVirtualMachine', () => {
    // The installer puts a BIOS boot loader on the GPT disk alongside the EFI
    // one, so SeaBIOS boots the image like it does every other x86-64 guest.
    it('creates a virtual machine booting SeaBIOS', () => {
      let qemuVmSpy = spyOn(openIndianaQemuVm, 'Vm')

      openIndiana.createVirtualMachine(
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
          firmware: `${firmwareDirectory}/share/qemu/bios-256k.bin`,
          microvmFirmware: `${firmwareDirectory}/share/qemu/qboot.rom`,
          kernel: `${resourcesDirectory}/kernel`
        }
      )
    })
  })
})
