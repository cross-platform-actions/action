import {QemuVm} from '../../../src/operating_systems/freebsd/qemu_vm'
import * as arch from '../../../src/architecture'
import {host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import {Accelerator} from '../../../src/vm'
import '../../../src/operating_systems/freebsd/freebsd'
import {Input} from '../../../src/action/input'

describe('FreeBSD QemuVm', () => {
  let memory = '5G'
  let cpuCount = 10
  let ssHostPort = 1234

  let osKind = os.Kind.for('freebsd')
  let architecture = arch.Architecture.for(
    arch.Kind.x86_64,
    host,
    osKind,
    host.hypervisor
  )
  let input = new Input()
  let config = {
    memory: memory,
    cpuCount: cpuCount,
    diskImage: '',
    ssHostPort: ssHostPort,
    cpu: '',
    accelerator: Accelerator.tcg,
    machineType: '',
    uuid: '',
    resourcesDiskImage: '',
    userboot: '',
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
