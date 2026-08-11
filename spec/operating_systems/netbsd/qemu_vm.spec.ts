import {Vm, VmRiscv64} from '../../../src/operating_systems/netbsd/qemu_vm'
import * as arch from '../../../src/architectures/factory'
import * as archKind from '../../../src/architectures/kind'
import {Host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import '../../../src/operating_systems/netbsd/netbsd'
import {Input} from '../../../src/action/input'

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
  let config = {
    memory: memory,
    cpuCount: cpuCount,
    diskImage: '',
    ssHostPort: ssHostPort,
    cpu: '',
    machineType: '',
    resourcesDiskImage: '',
    firmware: ''
  }
  let vm = new Vm('', '', architecture, input, config)

  let getFlagValue = (flag: string) => vm.command[vm.command.indexOf(flag) + 1]
  let actualMemory = () => getFlagValue('-m')
  let actualSmp = () => getFlagValue('-smp')
  let actualNetDevice = () => getFlagValue('-netdev')

  describe('command', () => {
    it('constucts a command with the correct memory configuration', () => {
      expect(actualMemory()).toEqual(memory)
    })

    it('constucts a command with the correct SMP configuration', () => {
      expect(actualSmp()).toEqual(cpuCount.toString())
    })

    it('constucts a command with the IPv6 disabled for the net device', () => {
      expect(actualNetDevice()).toEqual(
        `user,id=user.0,hostfwd=tcp::${ssHostPort}-:22,ipv6=off`
      )
    })
  })
})

describe('NetBSD QemuVm riscv64', () => {
  let host = Host.create('linux')
  let osKind = os.Kind.for('netbsd')
  let architecture = arch.create(
    archKind.Kind.riscv64,
    host,
    osKind,
    host.hypervisor
  )
  let input = new Input(host)
  let firmware = 'firmware/directory/share/qemu/u-boot.bin'
  let config = {
    memory: '5G',
    cpuCount: 2,
    diskImage: '',
    ssHostPort: 1234,
    cpu: 'rv64',
    machineType: 'virt',
    resourcesDiskImage: '',
    firmware: firmware
  }
  let vm = new VmRiscv64('', '', architecture, input, config)

  describe('command', () => {
    it('loads U-Boot as the kernel', () => {
      let index = vm.command.indexOf('-kernel')
      expect(index).toBeGreaterThan(-1)
      expect(vm.command[index + 1]).toEqual(firmware)
    })

    it('does not boot via -bios', () => {
      expect(vm.command).not.toContain('-bios')
    })

    it('attaches the disks as virtio MMIO devices', () => {
      expect(vm.command).toContain('virtio-blk-device,drive=drive0')
      expect(vm.command).toContain('virtio-blk-device,drive=drive1')
    })

    it('attaches the network device through the MMIO transport', () => {
      expect(vm.command).toContain('virtio-net-device,netdev=user.0')
    })
  })
})
