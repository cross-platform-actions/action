import * as core from '@actions/core'
import Action from './action'

async function main(): Promise<void> {
  try {
    await new Action().run()
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
