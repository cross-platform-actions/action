import * as fs from 'fs'
import * as os_module from 'os'
import * as path from 'path'

import {Vm} from '../../../src/operating_systems/netbsd/sparc64_vm'
import * as arch from '../../../src/architectures/factory'
import * as archKind from '../../../src/architectures/kind'
import {Host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import '../../../src/operating_systems/netbsd/netbsd'
import {Input} from '../../../src/action/input'
import {Configuration} from '../../../src/vm'

describe('NetBSD Sparc64Vm', () => {
  let host = Host.create('linux')
  let osKind = os.Kind.for('netbsd')
  let architecture = arch.create(
    archKind.Kind.sparc64,
    host,
    osKind,
    host.hypervisor
  )
  let input = new Input(host)
  let config: Configuration = {
    memory: '5G',
    cpuCount: 2,
    diskImage: 'disk.raw',
    ssHostPort: 1234,
    cpu: 'TI-UltraSparc-IIi',
    machineType: 'sun4u',
    resourcesDiskImage: '',
    firmware: 'firmware/share/qemu/openbios-sparc64'
  }

  let commandFor = (configuration: Configuration): string[] =>
    new Vm('', '', architecture, input, configuration).command

  let command = commandFor(config)
  let flagValue = (flag: string): string => command[command.indexOf(flag) + 1]
  let flagValues = (flag: string): string[] =>
    command.filter((_, i) => command[i - 1] === flag)

  it('uses the sun4u machine type', () => {
    expect(flagValue('-machine')).toContain('type=sun4u')
  })

  it('uses the UltraSPARC CPU', () => {
    expect(flagValue('-cpu')).toEqual('TI-UltraSparc-IIi')
  })

  it('boots OpenBIOS', () => {
    expect(flagValue('-bios')).toEqual('firmware/share/qemu/openbios-sparc64')
  })

  it('boots from the first hard disk', () => {
    expect(flagValue('-boot')).toEqual('c')
  })

  it('uses a single CPU, the most sun4u supports', () => {
    expect(flagValue('-smp')).toEqual('1')
  })

  it('clamps the memory to what sun4u can address', () => {
    expect(flagValue('-m')).toEqual('3072M')
  })

  it('leaves memory below the ceiling unchanged', () => {
    const lowMemory = commandFor({...config, memory: '2G'})

    expect(lowMemory[lowMemory.indexOf('-m') + 1]).toEqual('2G')
  })

  it('places the sunhme NIC on pciB', () => {
    expect(flagValues('-device')).toEqual(['sunhme,bus=pciB,netdev=user.0'])
  })

  it('disables IPv6 for the net device', () => {
    expect(flagValue('-netdev')).toEqual(
      'user,id=user.0,hostfwd=tcp:127.0.0.1:1234-:22,ipv6=off'
    )
  })

  it('attaches the system disk to the IDE controller', () => {
    expect(flagValues('-drive')).toEqual([
      'file=disk.raw,if=ide,index=0,media=disk,format=raw,cache=unsafe,discard=ignore'
    ])
  })

  // A custom image may still expect the SSH key on the resources disk.
  it('attaches a resources disk it was given to the IDE controller', () => {
    const resourcesDiskImage = path.join(
      fs.mkdtempSync(path.join(os_module.tmpdir(), 'cpa-sparc64-')),
      'res.raw'
    )
    fs.writeFileSync(resourcesDiskImage, '')
    const withResources = commandFor({...config, resourcesDiskImage})

    expect(withResources).toContain(
      `file=${resourcesDiskImage},if=ide,index=1,media=disk,format=raw,cache=unsafe,discard=ignore`
    )
  })
})
