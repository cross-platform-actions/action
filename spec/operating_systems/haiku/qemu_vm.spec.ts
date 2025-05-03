import {Vm} from '../../../src/operating_systems/haiku/qemu_vm'
import * as arch from '../../../src/architecture'
import {host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import '../../../src/operating_systems/haiku/haiku'
import {Input} from '../../../src/action/input'
import {Executor} from '../../../src/utility'

describe('Haiku QemuVm', () => {
  let memory = '5G'
  let cpuCount = 10
  let ssHostPort = 1234

  let osKind = os.Kind.for('haiku')
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
  let actualNetworkBackend = () => getFlagValue('-netdev')

  beforeEach(() => {
    executor = jasmine.createSpyObj<Executor>('executor', ['execute'])
    vm = new Vm('', '', architecture, input, config, executor)
  })

  describe('command', () => {
    it('constucts a command with the correct memory configuration', () => {
      expect(actualMemory()).toEqual(memory)
    })

    it('constucts a command with the correct SMP configuration', () => {
      expect(actualSmp()).toEqual(cpuCount.toString())
    })

    it('constucts a command with the IPv6 disabled for the network backend', () => {
      expect(actualNetworkBackend()).toEqual(
        `user,id=user.0,hostfwd=tcp::${ssHostPort}-:22,ipv6=off`
      )
    })

    it('constucts a command with the network device set to "e1000"', () => {
      expect(vm.command).toContain('e1000,netdev=user.0')
    })
  })

  describe('execute', () => {
    let buffer = Buffer.from('foo')

    it('executes the given command', async () => {
      await vm.execute('foo')

      expect(executor.execute).toHaveBeenCalledOnceWith(
        'ssh',
        ['-t', 'user@cross_platform_actions_host'],
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
        ['-t', 'user@cross_platform_actions_host', 'foo'],
        jasmine.objectContaining({input: buffer})
      )
    })
  })

  describe('setupWorkDirectory', () => {
    it('sets up the working directory', async () => {
      let homeDirectory = '/home/runner/work'
      let workDirectory = '/home/runner/work/repo/repo'
      let buffer = Buffer.from(
        undent`
          mkdir -p '/home/runner/work/repo/repo' && \
          ln -sf '/boot/home/' '/home/runner/work'
        `
      )

      await vm.setupWorkDirectory(homeDirectory, workDirectory)

      expect(executor.execute).toHaveBeenCalledWith(
        'ssh',
        ['-t', 'user@cross_platform_actions_host'],
        jasmine.objectContaining({input: buffer})
      )
    })
  })
})

function undent(strings: TemplateStringsArray): string {
  const fullString = strings.join('')
  const match = fullString.match(/^[ \t]*(?=\S)/gm)
  const minIndent = match ? Math.min(...match.map(x => x.length)) : 0

  return fullString
    .replace(new RegExp(`^[ \\t]{${minIndent}}`, 'gm'), '')
    .replace(/ {2,}/g, ' ')
    .trim()
}
