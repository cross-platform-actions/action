import * as core from '@actions/core'
import {Action} from './action/action'

async function main(): Promise<void> {
  try {
    await new Action().run()
  } catch (error: unknown) {
    const err = error as Error
    core.setFailed(err.message)

    if (core.isDebug() && err.stack) core.debug(err.stack)
  }
}

main()
