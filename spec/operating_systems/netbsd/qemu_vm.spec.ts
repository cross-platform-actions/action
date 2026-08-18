import * as fs from 'fs'
import * as os_module from 'os'
import * as path from 'path'

import {Vm, MicrovmVm} from '../../../src/operating_systems/netbsd/qemu_vm'
import * as arch from '../../../src/architectures/factory'
import * as archKind from '../../../src/architectures/kind'
import {Host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import '../../../src/operating_systems/netbsd/netbsd'
import {Input} from '../../../src/action/input'
import {Configuration} from '../../../src/vm'

describe('NetBSD QemuVm', () => {
  let memory = '5G'
  let cpuCount = 10
  let ssHostPort = 1234

  let host = Host.create('linux')
  let osKind = os.Kind.for('netbsd')
  let architecture = arch.create(
    archKind.Kind.x86_64,
    host,
    osKind,
    host.hypervisor
  )
  let input = new Input(host)
  let config: Configuration = {
    memory: memory,
    cpuCount: cpuCount,
    diskImage: '',
    ssHostPort: ssHostPort,
    cpu: '',
    machineType: '',
    resourcesDiskImage: '',
    firmware: ''
  }

  let touch = (name: string): string => {
    const file = path.join(
      fs.mkdtempSync(path.join(os_module.tmpdir(), 'cpa-microvm-')),
      name
    )
    fs.writeFileSync(file, '')

    return file
  }

  let getFlagValue = (command: string[], flag: string) =>
    command[command.indexOf(flag) + 1]

  describe('the firmware boot path', () => {
    let command = new Vm('', '', architecture, input, config).command

    it('constucts a command with the correct memory configuration', () => {
      expect(getFlagValue(command, '-m')).toEqual(memory)
    })

    it('constucts a command with the correct SMP configuration', () => {
      expect(getFlagValue(command, '-smp')).toEqual(cpuCount.toString())
    })

    it('constucts a command with the IPv6 disabled for the net device', () => {
      expect(getFlagValue(command, '-netdev')).toEqual(
        `user,id=user.0,hostfwd=tcp:127.0.0.1:${ssHostPort}-:22,ipv6=off`
      )
    })

    it('boots the firmware on a PCI machine', () => {
      const joined = command.join(' ')

      expect(joined).toContain('-bios')
      expect(joined).toContain('virtio-scsi-pci')
      expect(joined).not.toContain('+invtsc')
      expect(joined).not.toContain('-kernel')
      expect(joined).not.toContain('microvm')
      expect(joined).not.toContain('virtio-mmio')
    })

    // The published images need no key, so the action builds no resources disk
    // to carry one and there is nothing to attach.
    it('attaches no resources disk when none was built', () => {
      expect(command.join(' ')).not.toContain('drive1')
    })
  })

  // A custom image may have been built from a release that expects the key on
  // the resources disk, so the action still builds one -- and it has to reach
  // the guest.
  describe('the firmware boot path, with a resources disk', () => {
    it('attaches the resources disk it was given', () => {
      const resourcesDiskImage = touch('resources.raw')
      const command = new Vm('', '', architecture, input, {
        ...config,
        resourcesDiskImage: resourcesDiskImage
      }).command.join(' ')

      expect(command).toContain('scsi-hd,drive=drive1,bootindex=1')
      expect(command).toContain(`file=${resourcesDiskImage},id=drive1`)
    })
  })

  describe('the microvm boot path', () => {
    let kernel: string
    let microvmFirmware: string
    let command: string

    beforeAll(() => {
      kernel = touch('kernel')
      microvmFirmware = touch('qboot.rom')
      command = new MicrovmVm('', '', architecture, input, {
        ...config,
        kernel: kernel,
        microvmFirmware: microvmFirmware
      }).command.join(' ')
    })

    it('boots the kernel directly on the microvm machine', () => {
      expect(command).toContain('-machine type=microvm,acpi=off,pic=off')
      expect(command).toContain(`-kernel ${kernel}`)
      expect(command).toContain('-append root=dk0 console=com rw')
    })

    // Without this the guest won't use the TSC, and the only timecounter left
    // on this machine type is the i8254, which is two port reads away.
    it('advertises an invariant TSC', () => {
      const args = command.split(' ')
      const cpuFlag = args[args.indexOf('-cpu') + 1]

      expect(cpuFlag.split(',')).toContain('+invtsc')
    })

    // The firmware is what loads the kernel on this machine type, and the only
    // thing that leaves an MP table behind for a guest without ACPI to read.
    it('boots qboot rather than the SeaBIOS the other path uses', () => {
      expect(command).toContain(`-bios ${microvmFirmware}`)
      expect(command).not.toContain('bios-256k.bin')
    })

    // The microvm machine type has no PCI bus, so virtio arrives over MMIO
    // and there is no PCI address to give the network device either.
    it('attaches virtio over MMIO', () => {
      expect(command).toContain('virtio-blk-device')
      expect(command).toContain('virtio-net-device,netdev=user.0 ')
      expect(command).toContain('-global virtio-mmio.force-legacy=false')
      expect(command).not.toContain('virtio-scsi-pci')
      expect(command).not.toContain('addr=0x03')
    })

    // The variant has never been released, so no custom image can expect a
    // resources disk on it.
    it('attaches no resources disk', () => {
      expect(command).not.toContain('drive1')
    })
  })

  // Whether the variant can be booted comes down to which files are on disk,
  // so these need real ones.
  describe('MicrovmVm.validate', () => {
    it('accepts a kernel and a microvm firmware that are both there', () => {
      expect(() =>
        MicrovmVm.validate({
          ...config,
          kernel: touch('kernel'),
          microvmFirmware: touch('qboot.rom')
        })
      ).not.toThrow()
    })

    // An image built before NetBSD had a MICROVM kernel configuration, or for
    // an architecture without one, carries no kernel.
    it('rejects an image bundle that carried no kernel', () => {
      expect(() =>
        MicrovmVm.validate({
          ...config,
          microvmFirmware: touch('qboot.rom')
        })
      ).toThrowError(/carries no kernel/)
    })

    // A hypervisor archive from before this needed qboot has no firmware that
    // can boot a kernel on the microvm machine.
    it('rejects a hypervisor archive that carried no microvm firmware', () => {
      expect(() =>
        MicrovmVm.validate({
          ...config,
          kernel: touch('kernel'),
          microvmFirmware: '/nonexistent/qboot.rom'
        })
      ).toThrowError(/carries no microvm firmware/)
    })

    // Both reasons, so a user isn't sent to fix one and told about the other
    // on the next run.
    it('reports both when neither is there', () => {
      expect(() => MicrovmVm.validate(config)).toThrowError(
        /carries no kernel and .*carries no microvm firmware/
      )
    })
  })
})
