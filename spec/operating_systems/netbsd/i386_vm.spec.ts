import {Vm} from '../../../src/operating_systems/netbsd/i386_vm'
import * as arch from '../../../src/architectures/factory'
import * as archKind from '../../../src/architectures/kind'
import {Host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import '../../../src/operating_systems/netbsd/netbsd'
import {Input} from '../../../src/action/input'
import {Configuration} from '../../../src/vm'

describe('NetBSD I386Vm', () => {
  let host = Host.create('linux')
  let architecture = arch.create(
    archKind.Kind.i386,
    host,
    os.Kind.for('netbsd'),
    host.hypervisor
  )
  let input = new Input(host)
  let config: Configuration = {
    memory: '6G',
    cpuCount: 2,
    diskImage: 'disk.raw',
    ssHostPort: 1234,
    cpu: 'max',
    machineType: 'pc',
    resourcesDiskImage: '',
    firmware: 'firmware/share/qemu/bios-256k.bin'
  }

  let flagValue = (configuration: Configuration, flag: string): string => {
    const command = new Vm('', '', architecture, input, configuration).command

    return command[command.indexOf(flag) + 1]
  }

  it('uses the pc machine type', () => {
    expect(flagValue(config, '-machine')).toContain('type=pc,')
  })

  // From 3.5 GiB, `pc` moves everything above 3 GiB past 4 GiB, which a kernel
  // without PAE can't reach.
  it('caps the memory just below 3.5 GiB', () => {
    expect(flagValue(config, '-m')).toEqual('3583M')
  })

  it('leaves memory below the cap unchanged', () => {
    expect(flagValue({...config, memory: '2G'}, '-m')).toEqual('2G')
  })
})
