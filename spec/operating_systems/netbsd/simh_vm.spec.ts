import {Vm} from '../../../src/operating_systems/netbsd/simh_vm'
import * as arch from '../../../src/architecture'
import {Host} from '../../../src/host'
import * as os from '../../../src/operating_systems/kind'
import '../../../src/operating_systems/netbsd/netbsd'
import {Input} from '../../../src/action/input'

describe('NetBSD SimhVm', () => {
  let memory = '5G'
  let cpuCount = 10
  let ssHostPort = 1234

  let host = Host.create('linux')
  let osKind = os.Kind.for('netbsd')
  let architecture = arch.Architecture.for(
    arch.Kind.vax,
    host,
    osKind,
    host.hypervisor
  )
  let input = new Input(host)

  let createVm = (memory: string) => {
    let config = {
      memory: memory,
      cpuCount: cpuCount,
      diskImage: '/images/disk.raw',
      ssHostPort: ssHostPort,
      cpu: '',
      machineType: '',
      resourcesDiskImage: '/images/res.raw',
      firmware: ''
    }

    return new Vm('/hypervisor', '/resources', architecture, input, config)
  }

  let vm = createVm(memory)
  let configurationLines = () => vm.configurationFile.trim().split('\n')

  describe('command', () => {
    it('runs the VAX simulator with the configuration file', () => {
      expect(vm.command).toEqual(['/hypervisor/vax', '/resources/simh.ini'])
    })
  })

  describe('configurationFile', () => {
    it('exposes the console via Telnet without requiring a client', () => {
      expect(configurationLines()).toContain(
        'set console telnet=127.0.0.1:2848'
      )
      expect(configurationLines()).toContain('set console telnet=buffered')
    })

    it('logs the console output', () => {
      expect(configurationLines()).toContain(
        'set console log=/tmp/cross-platform-actions.log'
      )
    })

    it('attaches the disk image as a raw RA92 disk', () => {
      expect(configurationLines()).toContain('set rq0 ra92')
      expect(configurationLines()).toContain('attach rq0 /images/disk.raw')
    })

    it('does not set a disk format (raw is the SIMH default)', () => {
      expect(vm.configurationFile).not.toContain('format=')
    })

    it('does not attach a resources disk', () => {
      expect(vm.configurationFile).not.toContain('/images/res.raw')
    })

    it('does not attach an NVRAM image', () => {
      expect(vm.configurationFile).not.toContain('attach nvr')
    })

    it('disables the unused disk units', () => {
      expect(configurationLines()).toContain('set rq1 disable')
      expect(configurationLines()).toContain('set rq2 disable')
      expect(configurationLines()).toContain('set rq3 disable')
    })

    it('forwards the SSH port to the VM', () => {
      expect(configurationLines()).toContain(
        `attach xq nat:tcp=${ssHostPort}:10.0.2.15:22`
      )
    })

    it('boots the system disk from the firmware console prompt', () => {
      let lines = configurationLines()
      let expectIndex = lines.indexOf(
        'expect ">>>" send "BOOT DUA0\\r"; continue'
      )
      let bootIndex = lines.indexOf('boot cpu')

      expect(expectIndex).toBeGreaterThanOrEqual(0)
      expect(bootIndex).toBeGreaterThan(expectIndex)
    })

    describe('memory', () => {
      it('limits the memory to 512M, the maximum the MicroVAX 3900 supports', () => {
        expect(configurationLines()).toContain('set cpu 512M')
      })

      it('uses the configured memory when the MicroVAX 3900 supports it', () => {
        expect(createVm('64M').configurationFile).toContain('set cpu 64M')
      })

      it('rounds the memory down to the largest supported size', () => {
        expect(createVm('100M').configurationFile).toContain('set cpu 64M')
      })

      it('accepts fractional memory values', () => {
        expect(createVm('0.25G').configurationFile).toContain('set cpu 256M')
      })

      it('throws an error for memory below 16M', () => {
        expect(() => createVm('8M').configurationFile).toThrowError(
          /^Invalid memory/
        )
      })

      it('throws an error for unrecognized memory values', () => {
        expect(() => createVm('lots').configurationFile).toThrowError(
          /^Invalid memory/
        )
      })
    })
  })
})
