import {Clock, SystemClock} from './clock'

// A point in time, a given number of seconds from now, that something is
// allowed to take at most.
export class Deadline {
  private readonly clock: Clock
  private readonly expiresAt: number

  constructor(seconds: number, clock: Clock = new SystemClock()) {
    this.clock = clock
    this.expiresAt = clock.now() + seconds * 1000
  }

  get hasPassed(): boolean {
    return this.remaining <= 0
  }

  // Sleeps for the given duration, or until the deadline expires, whichever
  // comes first.
  async sleepAtMost(milliseconds: number): Promise<void> {
    const remaining = this.remaining

    if (remaining <= 0) return

    await this.clock.sleep(Math.min(milliseconds, remaining))
  }

  private get remaining(): number {
    return this.expiresAt - this.clock.now()
  }
}
