import {
  QemuVm,
  QemuVmRiscv64
} from '../../../src/operating_systems/freebsd/qemu_vm'
import * as arch from '../../../src/architectures/factory'
import * as archKind from '../../../src/architectures/kind'
import {Host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import '../../../src/operating_systems/freebsd/freebsd'
import {Input} from '../../../src/action/input'

describe('FreeBSD QemuVm', () => {
  let memory = '5G'
  let cpuCount = 10
  let ssHostPort = 1234

  let host = Host.create('linux')
  let osKind = os.Kind.for('freebsd')
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
  let vm = new QemuVm('', '', architecture, input, config)

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
        `user,id=user.0,hostfwd=tcp::${ssHostPort}-:22`
      )
    })
  })
})

describe('FreeBSD QemuVm riscv64', () => {
  let host = Host.create('linux')
  let osKind = os.Kind.for('freebsd')
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
  let vm = new QemuVmRiscv64('', '', architecture, input, config)

  describe('command', () => {
    it('loads U-Boot as the kernel', () => {
      let index = vm.command.indexOf('-kernel')
      expect(index).toBeGreaterThan(-1)
      expect(vm.command[index + 1]).toEqual(firmware)
    })

    it('does not boot via -bios', () => {
      expect(vm.command).not.toContain('-bios')
    })
  })
})
