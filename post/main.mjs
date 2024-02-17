import {existsSync} from 'fs'
import {spawnSync} from 'child_process'

if (existsSync('/tmp/cross-platform-actions.log'))
  spawnSync('sudo', ['cat', '/tmp/cross-platform-actions.log'], {stdio: 'inherit'})
