import {Input} from '../../src/action/input'
import {SyncDirection} from '../../src/action/sync_direction'
import {DefaultVmFileSystemSynchronizer} from '../../src/vm_file_system_synchronizer'
import {Executor} from '../../src/utility'

describe('DefaultVmFileSystemSynchronizer', () => {
  let synchronizer: DefaultVmFileSystemSynchronizer
  let executor: Executor

  beforeEach(() => {
    let input = jasmine.createSpyObj<Input>(
      'Input',
      {},
      {syncFiles: SyncDirection.both}
    )

    executor = jasmine.createSpyObj<Executor>('Executor', ['execute'])

    synchronizer = new DefaultVmFileSystemSynchronizer({
      input,
      executor,
      user: 'user',
      workingDirectory: '/home/runner/runner/work',
      isDebug: false
    })
  })

  describe('synchronizePaths', () => {
    it('should synchronize all paths to the VM', async () => {
      await synchronizer.synchronizePaths('that_that_is_excluded')

      expect(executor.execute).toHaveBeenCalledWith('rsync', [
        '-auz',
        '--exclude',
        '_actions/cross-platform-actions/action',
        '--exclude',
        'that_that_is_excluded',
        '/home/runner/',
        'user@cross_platform_actions_host:work'
      ])
    })
  })

  describe('synchronizeBack', () => {
    it('should synchronize all paths to the host', async () => {
      await synchronizer.synchronizeBack()

      expect(executor.execute).toHaveBeenCalledWith('rsync', [
        '-auz',
        'user@cross_platform_actions_host:work/',
        '/home/runner'
      ])
    })
  })
})
