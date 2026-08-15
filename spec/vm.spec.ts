import {Clock} from '../src/clock'
import {Configuration, Vm} from '../src/vm'
import {Executor} from '../src/utility'
import {Host} from '../src/host'
import {Input} from '../src/action/input'
import * as arch from '../src/architectures/factory'
import * as archKind from '../src/architectures/kind'
import * as os from '../src/operating_systems/kind'
import '../src/operating_systems/netbsd/netbsd'

class TestVm extends Vm {
  protected get command(): string[] {
    return []
  }
}

class FakeClock implements Clock {
  private time = 0

  now(): number {
    return this.time
  }

  async sleep(milliseconds: number): Promise<void> {
    this.advance(milliseconds)
  }

  advance(milliseconds: number): void {
    this.time += milliseconds
  }
}

// An SSH probe that takes `duration` seconds to complete and that succeeds on
// attempt number `succeedsOnAttempt`.
class FakeSsh implements Executor {
  attempts = 0
  args: string[] = []

  private readonly clock: FakeClock
  private readonly duration: number
  private readonly succeedsOnAttempt: number

  constructor({
    clock,
    duration,
    succeedsOnAttempt = Infinity
  }: {
    clock: FakeClock
    duration: number
    succeedsOnAttempt?: number
  }) {
    this.clock = clock
    this.duration = duration
    this.succeedsOnAttempt = succeedsOnAttempt
  }

  async execute(_commandLine: string, args: string[] = []): Promise<number> {
    this.attempts++
    this.args = args
    this.clock.advance(this.duration * 1000)

    return this.attempts >= this.succeedsOnAttempt ? 0 : 255
  }
}

describe('Vm', () => {
  let clock: FakeClock

  const host = Host.create('linux')
  const architecture = arch.create(
    archKind.Kind.x86_64,
    host,
    os.Kind.for('netbsd'),
    host.hypervisor
  )

  const configuration: Configuration = {
    memory: '6G',
    cpuCount: 2,
    diskImage: '',
    ssHostPort: 2847,
    cpu: '',
    machineType: '',
    resourcesDiskImage: ''
  }

  const createVm = (ssh: Executor): Vm =>
    new TestVm(
      '',
      '',
      '',
      architecture,
      new Input(host),
      configuration,
      ssh,
      clock
    )

  beforeEach(() => (clock = new FakeClock()))

  describe('wait', () => {
    it('returns as soon as a probe succeeds', async () => {
      const ssh = new FakeSsh({clock, duration: 1, succeedsOnAttempt: 3})

      await expectAsync(createVm(ssh).wait(240)).toBeResolved()

      expect(ssh.attempts).toEqual(3)
      // Three probes of one second each, with a one second pause in between.
      expect(clock.now()).toEqual(5000)
    })

    it('gives up when the timeout has elapsed, even when probes are slow', async () => {
      const ssh = new FakeSsh({clock, duration: 76})

      await expectAsync(createVm(ssh).wait(240)).toBeRejectedWithError(
        /timed out after 240 seconds and 4 attempt\(s\)$/
      )

      // Four attempts, not 240, and roughly the requested 240 seconds instead
      // of the 5 hours that 240 probes would have taken.
      expect(ssh.attempts).toEqual(4)
      expect(clock.now()).toEqual(4 * 76000 + 3 * 1000)
    })

    it('gives up when the timeout has elapsed and probes fail immediately', async () => {
      const ssh = new FakeSsh({clock, duration: 0})

      await expectAsync(createVm(ssh).wait(5)).toBeRejectedWithError(
        /timed out after 5 seconds and 5 attempt\(s\)$/
      )

      expect(clock.now()).toEqual(5000)
    })

    it('does not pause beyond the timeout', async () => {
      const ssh = new FakeSsh({clock, duration: 2})

      await expectAsync(createVm(ssh).wait(2.5)).toBeRejected()

      expect(ssh.attempts).toEqual(1)
      expect(clock.now()).toEqual(2500)
    })

    // The hypervisor's user mode networking accepts the forwarded connection
    // before the guest does, so a probe against a guest that isn't listening
    // yet blocks for the whole connect timeout rather than failing fast. The
    // SSH configuration's ten seconds would then dominate the boot time of a
    // guest that becomes ready sooner.
    it('bounds a single probe well below the SSH configuration timeout', async () => {
      const ssh = new FakeSsh({clock, duration: 0, succeedsOnAttempt: 1})

      await createVm(ssh).wait(240)

      expect(ssh.args).toEqual([
        '-t',
        '-o',
        'ConnectTimeout=2',
        `runner@${Vm.cpaHost}`
      ])
    })
  })
})
