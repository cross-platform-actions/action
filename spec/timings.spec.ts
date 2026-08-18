import * as core from '@actions/core'

import {Clock} from '../src/clock'
import {Timings} from '../src/timings'

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

describe('Timings', () => {
  let clock: FakeClock
  let timings: Timings

  beforeEach(() => {
    clock = new FakeClock()
    timings = new Timings(clock)
  })

  describe('measure', () => {
    it('returns the value the block resolves to', async () => {
      await expectAsync(
        timings.measure('phase', async () => 42)
      ).toBeResolvedTo(42)
    })

    it('records how long the block took', async () => {
      await timings.measure('phase', async () => clock.advance(1500))

      expect(reportedLines(timings)).toContain('  phase      1.50 s')
    })

    it('records the duration even when the block throws', async () => {
      const block = async (): Promise<void> => {
        clock.advance(2000)
        throw Error('boom')
      }

      await expectAsync(timings.measure('phase', block)).toBeRejected()

      expect(reportedLines(timings)).toContain('  phase      2.00 s')
    })

    it('indents nested phases', async () => {
      await timings.measure('phase', async () => clock.advance(1000), {
        nested: true
      })

      expect(reportedLines(timings)).toContain('    phase      1.00 s')
    })
  })

  describe('report', () => {
    it('reports the phases in the order they were recorded', async () => {
      await timings.measure('first', async () => clock.advance(1000))
      await timings.measure('second', async () => clock.advance(2000))

      const lines = reportedLines(timings)

      expect(lines[1]).toMatch(/^ {2}first/)
      expect(lines[2]).toMatch(/^ {2}second/)
    })

    it('reports the total wall clock time since it was created', async () => {
      clock.advance(500)
      await timings.measure('phase', async () => clock.advance(1000))

      expect(reportedLines(timings)).toContain('  total      1.50 s')
    })

    it('reports a phase before the phases nested inside it', async () => {
      await timings.measure('outer', async () => {
        await timings.measure('inner', async () => clock.advance(1000), {
          nested: true
        })
      })

      const lines = reportedLines(timings)

      expect(lines[1]).toMatch(/^ {2}outer/)
      expect(lines[2]).toMatch(/^ {4}inner/)
    })

    // Only useful for comparing runs mechanically, so it's kept out of the
    // log every job prints.
    it('reports the phases as JSON, to the debug log', async () => {
      await timings.measure('phase', async () => clock.advance(1000))

      expect(debuggedLines(timings)).toContain(
        'Timings (JSON): {"phase":1,"total":1}'
      )
    })

    it('qualifies the JSON keys of nested phases with their phase', async () => {
      await timings.measure('outer', async () => {
        await timings.measure('inner', async () => clock.advance(1000), {
          nested: true
        })
      })

      expect(debuggedLines(timings)).toContain(
        'Timings (JSON): {"outer":1,"outer / inner":1,"total":1}'
      )
    })
  })
})

function reportedLines(timings: Timings): string[] {
  return capturedLines(timings, 'info')
}

function debuggedLines(timings: Timings): string[] {
  return capturedLines(timings, 'debug')
}

function capturedLines(timings: Timings, method: 'info' | 'debug'): string[] {
  const lines: string[] = []
  spyOn(core, method).and.callFake(line => lines.push(line))
  spyOn(core, method === 'info' ? 'debug' : 'info')
  timings.report('Timings')

  return lines
}
