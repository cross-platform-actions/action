import {existsSync, statSync} from 'fs'
import {spawnSync} from 'child_process'

// The serial console log of the VM. It's written by the hypervisor, which runs
// as root. `statSync` only requires search permission on the directory, so the
// size of a root owned file can be inspected without elevated privileges, but
// reading the content requires `sudo`.
const logFile = '/tmp/cross-platform-actions.log'

if (!existsSync(logFile))
  console.log(`No VM console log was produced at: ${logFile}`)
else if (statSync(logFile).size === 0)
  console.log(
    `The VM console log is empty: ${logFile}\n` +
      'The guest might not have its console attached to the serial port.'
  )
else spawnSync('sudo', ['cat', logFile], {stdio: 'inherit'})

// The SIMH simulator (used by the VAX guest) writes its own console log.
const simhLogFile = '/tmp/cross-platform-actions-simh.log'

if (existsSync(simhLogFile))
  spawnSync('sudo', ['cat', simhLogFile], {stdio: 'inherit'})
