import {spawnSync} from 'child_process'

import * as architecture from '../src/architecture'
import * as vmModule from '../src/vm'
import {OperatingSystem} from '../src/operating_system'

class TestOperatingSystem extends OperatingSystem {
  get virtualMachineImageReleaseVersion(): string {
    return '0.0.0'
  }

  get hypervisorUrl(): string {
    return ''
  }

  get ssHostPort(): number {
    return 2847
  }

  createVirtualMachine(): vmModule.Vm {
    throw Error('Not implemented')
  }
}

const architectureStub = {
  host: {toString: (): string => 'linux'}
} as unknown as architecture.Architecture

// Matches the console output the same way the generated `cpa.sh` does, so the
// pattern is exercised as a POSIX extended regular expression by `grep`,
// instead of in the JavaScript flavor.
const matches = (pattern: string, consoleOutput: string): boolean =>
  spawnSync('grep', ['-qE', pattern], {input: consoleOutput}).status === 0

describe('OperatingSystem', () => {
  const operatingSystem = new TestOperatingSystem(architectureStub, '0.0.0')
  const pattern = operatingSystem.consoleCrashPattern

  describe('consoleCrashPattern', () => {
    it('matches the panic of a Haiku guest', () => {
      const consoleOutput =
        'PANIC: bound endpoint 0xffffffff9e58f300 not in hash!\nkdebug> \n'

      expect(matches(pattern, consoleOutput)).toBeTrue()
    })

    it('matches the panic of a BSD guest', () => {
      expect(matches(pattern, 'panic: page fault\ndb{0}> \n')).toBeTrue()
    })

    it('matches the panic of an illumos guest', () => {
      const consoleOutput = 'panic[cpu0]/thread=fffffe0059446c20: bad trap\n'

      expect(matches(pattern, consoleOutput)).toBeTrue()
    })

    it('matches a panic indented by the console', () => {
      expect(matches(pattern, '  panic: out of memory\n')).toBeTrue()
    })

    it("doesn't match the console output of a healthy guest", () => {
      const consoleOutput = 'Welcome to Haiku!\n~> uname\nHaiku\n'

      expect(matches(pattern, consoleOutput)).toBeFalse()
    })

    it("doesn't match output that merely mentions a panic", () => {
      const consoleOutput = 'kern.panic_reboot_wait_time: 15\nno panic here\n'

      expect(matches(pattern, consoleOutput)).toBeFalse()
    })
  })
})
