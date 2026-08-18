import * as core from '@actions/core'

import {Clock, SystemClock} from './clock'

interface Measurement {
  name: string
  milliseconds: number
  // Phases that run concurrently with their siblings, inside the phase they're
  // recorded under. Their durations overlap, so they don't add up to the
  // duration of that phase.
  nested: boolean
}

interface MeasureOptions {
  nested?: boolean
}

// Records how long the individual phases of setting up a VM take, so the setup
// time can be broken down and compared between runs.
export class Timings {
  private readonly clock: Clock
  private readonly startedAt: number
  private readonly measurements: Measurement[] = []

  constructor(clock: Clock = new SystemClock()) {
    this.clock = clock
    this.startedAt = clock.now()
  }

  // The wall clock time, in milliseconds, that has elapsed since this instance
  // was created.
  get elapsed(): number {
    return this.clock.now() - this.startedAt
  }

  // Runs `block`, recording how long it took under `name`. Phases are reported
  // in the order they start, so a phase always precedes the nested phases it
  // runs.
  async measure<T>(
    name: string,
    block: () => Promise<T>,
    {nested = false}: MeasureOptions = {}
  ): Promise<T> {
    const startedAt = this.clock.now()
    const measurement: Measurement = {name, milliseconds: 0, nested}
    this.measurements.push(measurement)

    try {
      return await block()
    } finally {
      measurement.milliseconds = this.clock.now() - startedAt
    }
  }

  // Logs the recorded phases, in the order they started, followed by the total
  // wall clock time. The same numbers go to the debug log as JSON, for
  // comparing runs mechanically.
  report(title: string): void {
    const total = this.elapsed
    const width = Math.max(
      this.totalLabel.length,
      ...this.measurements.map(m => this.label(m).length)
    )

    core.info(
      `${title} (indented phases run concurrently, inside the phase they're ` +
        'listed under):'
    )

    for (const measurement of this.measurements)
      core.info(
        this.format(this.label(measurement), measurement.milliseconds, width)
      )

    core.info(this.format(this.totalLabel, total, width))
    core.debug(`${title} (JSON): ${JSON.stringify(this.toJson(total))}`)
  }

  private get totalLabel(): string {
    return 'total'
  }

  private label(measurement: Measurement): string {
    return measurement.nested ? `  ${measurement.name}` : measurement.name
  }

  private format(label: string, milliseconds: number, width: number): string {
    const seconds = (milliseconds / 1000).toFixed(2)
    return `  ${label.padEnd(width)}  ${seconds.padStart(8)} s`
  }

  private toJson(total: number): Record<string, number> {
    const json: Record<string, number> = {}
    let parent = ''

    for (const measurement of this.measurements) {
      if (measurement.nested)
        json[`${parent}${measurement.name}`] = measurement.milliseconds / 1000
      else {
        json[measurement.name] = measurement.milliseconds / 1000
        // Nested phase names are only unique within the phase they belong to,
        // so qualify them to keep the keys of the JSON object unique.
        parent = `${measurement.name} / `
      }
    }

    json[this.totalLabel] = total / 1000

    return json
  }
}
