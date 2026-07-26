import {wait} from './wait'

export interface Clock {
  now(): number
  sleep(milliseconds: number): Promise<void>
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now()
  }

  async sleep(milliseconds: number): Promise<void> {
    await wait(milliseconds)
  }
}
