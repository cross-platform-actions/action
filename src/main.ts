import * as core from '@actions/core'
import {Action} from './action/action'

import './operating_systems/freebsd/factory'
import './operating_systems/haiku/factory'
import './operating_systems/netbsd/factory'
import './operating_systems/omnios/factory'
import './operating_systems/openbsd/factory'

async function main(): Promise<void> {
  if (core.isDebug()) {
    await new Action().run()
  } else {
    try {
      await new Action().run()
    } catch (error: unknown) {
      const err = error as Error
      core.setFailed(err.message)
    }
  }
}

main()
