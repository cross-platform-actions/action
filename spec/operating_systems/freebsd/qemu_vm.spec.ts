import {QemuVm} from '../../../src/operating_systems/freebsd/qemu_vm'
import * as arch from '../../../src/architecture'
import {host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import {Accelerator} from '../../../src/vm'
import '../../../src/operating_systems/freebsd/freebsd'

describe('FreeBSD QemuVm', () => {
  let memory = '5G'

  let osKind = os.Kind.for('freebsd')
  let architecture = arch.Architecture.for(arch.Kind.x86_64, host, osKind)
  let config = {
    memory: memory,
    cpuCount: 0,
    diskImage: '',
    ssHostPort: 0,
    cpu: '',
    accelerator: Accelerator.tcg,
    machineType: '',
    uuid: '',
    resourcesDiskImage: '',
    userboot: '',
    firmware: ''
  }
  let vm = new QemuVm('', '', architecture, config)

  let getFlagValue = (flag: string) => vm.command[vm.command.indexOf(flag) + 1]
  let actualMemory = () => getFlagValue('-m')

  describe('command', () => {
    it('constucts a command with the correct memory configuration', () => {
      expect(actualMemory()).toEqual(memory)
    })
  })
})
