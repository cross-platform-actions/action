import {Vm} from '../../../src/operating_systems/omnios/qemu_vm'
import * as arch from '../../../src/architecture'
import {host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import '../../../src/operating_systems/omnios/omnios'
import {Input} from '../../../src/action/input'
import {Executor} from '../../../src/utility'

describe('OmniOS QemuVm', () => {
  let memory = '4G'
  let cpuCount = 8
  let ssHostPort = 5678

  let osKind = os.Kind.for('omnios')
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
    machineType: '',
    uuid: '',
    resourcesDiskImage: '',
    userboot: '',
    firmware: ''
  }

  let executor = jasmine.createSpyObj<Executor>('executor', ['execute'])
  let vm = new Vm('', '', architecture, input, config, executor)

  let getFlagValue = (flag: string) => vm.command[vm.command.indexOf(flag) + 1]
  let actualMemory = () => getFlagValue('-m')
  let actualSmp = () => getFlagValue('-smp')

  beforeEach(() => {
    executor = jasmine.createSpyObj<Executor>('executor', ['execute'])
    vm = new Vm('', '', architecture, input, config, executor)
  })

  describe('command', () => {
    it('constructs a command with the correct memory configuration', () => {
      expect(actualMemory()).toEqual(memory)
    })

    it('constructs a command with the correct SMP configuration', () => {
      expect(actualSmp()).toEqual(cpuCount.toString())
    })
  })

  describe('execute', () => {
    let buffer = Buffer.from('foo')

    it('executes the given command', async () => {
      await vm.execute('foo')

      expect(executor.execute).toHaveBeenCalledOnceWith(
        'ssh',
        ['-t', 'runner@cross_platform_actions_host'],
        jasmine.objectContaining({input: buffer})
      )
    })
  })

  describe('execute2', () => {
    let buffer = Buffer.from('')

    it('executes the given command', async () => {
      await vm.execute2(['foo'], buffer)

      expect(executor.execute).toHaveBeenCalledOnceWith(
        'ssh',
        ['-t', 'runner@cross_platform_actions_host', 'foo'],
        jasmine.objectContaining({input: buffer})
      )
    })
  })

  describe('setupWorkDirectory', () => {
    it('sets up the working directory', async () => {
      const homeDirectory = '/home/runner/work'
      const workDirectory = '/home/runner/work/repo/repo'
      const content =
        `rm -rf '/home/runner/work' && ` +
        `sudo mkdir -p '/home/runner/work/repo/repo' && ` +
        `sudo chown -R 'runner' '/home/runner/work' && ` +
        `ln -sf '/home/runner/work' '/home/runner/work'`
      let buffer = Buffer.from(content)

      await vm.setupWorkDirectory(homeDirectory, workDirectory)

      expect(executor.execute).toHaveBeenCalledWith(
        'ssh',
        ['-t', 'runner@cross_platform_actions_host'],
        jasmine.objectContaining({input: buffer})
      )
    })
  })
})
