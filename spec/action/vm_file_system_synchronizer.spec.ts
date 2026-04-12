import {Input} from '../../src/action/input'
import {SyncDirection} from '../../src/action/sync_direction'
import {
  DefaultVmFileSystemSynchronizer,
  commandToShellString
} from '../../src/vm_file_system_synchronizer'
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
      guestHomeDirectory: '/boot/home/home/runner',
      hostHomeDirectory: '/home/runner',
      isDebug: false
    })
  })

  describe('synchronizePathsCommand', () => {
    it('should return the command to synchronize paths to the VM', () => {
      const command = synchronizer.synchronizePathsCommand(
        'that_that_is_excluded'
      )

      expect(command).toEqual({
        program: 'rsync',
        args: [
          '-auz',
          '--exclude',
          '_actions/cross-platform-actions/action',
          '--exclude',
          'that_that_is_excluded',
          '/home/runner/',
          'user@cross_platform_actions_host:/boot/home/home/runner'
        ]
      })
    })

    it('should return the command without extra excludes when none are given', () => {
      const command = synchronizer.synchronizePathsCommand()

      expect(command).toEqual({
        program: 'rsync',
        args: [
          '-auz',
          '--exclude',
          '_actions/cross-platform-actions/action',
          '/home/runner/',
          'user@cross_platform_actions_host:/boot/home/home/runner'
        ]
      })
    })
  })

  describe('synchronizeBackCommand', () => {
    it('should return the command to synchronize paths to the host', () => {
      const command = synchronizer.synchronizeBackCommand()

      expect(command).toEqual({
        program: 'rsync',
        args: [
          '-auz',
          'user@cross_platform_actions_host:/boot/home/home/runner/',
          '/home/runner'
        ]
      })
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
        'user@cross_platform_actions_host:/boot/home/home/runner'
      ])
    })
  })

  describe('synchronizeBack', () => {
    it('should synchronize all paths to the host', async () => {
      await synchronizer.synchronizeBack()

      expect(executor.execute).toHaveBeenCalledWith('rsync', [
        '-auz',
        'user@cross_platform_actions_host:/boot/home/home/runner/',
        '/home/runner'
      ])
    })
  })
})

describe('commandToShellString', () => {
  it('should convert a simple command to a shell string', () => {
    const result = commandToShellString({
      program: 'rsync',
      args: ['-auz', '/home/runner/', 'user@host:/home/runner']
    })

    expect(result).toBe('rsync -auz /home/runner/ user@host:/home/runner')
  })

  it('should quote arguments with spaces', () => {
    const result = commandToShellString({
      program: 'rsync',
      args: ['-auz', '/path with spaces/']
    })

    expect(result).toBe("rsync -auz '/path with spaces/'")
  })

  it('should quote arguments with single quotes', () => {
    const result = commandToShellString({
      program: 'echo',
      args: ["it's"]
    })

    expect(result).toBe("echo 'it'\\''s'")
  })
})
