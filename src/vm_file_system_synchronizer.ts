import * as core from '@actions/core'
import path from 'path'

import flatMap from 'array.prototype.flatmap'

import {Executor, ExecExecutor} from './utility'
import {Input} from './action/input'
import {SyncDirection} from './action/sync_direction'
import * as vm from './vm'

export interface VmFileSystemSynchronizer {
  synchronizePaths(...excludePaths: string[]): Promise<void>
  synchronizeBack(): Promise<void>
}

export class DefaultVmFileSystemSynchronizer
  implements VmFileSystemSynchronizer
{
  private readonly executor: Executor
  private readonly input: Input
  private readonly cpaHost = vm.Vm.cpaHost
  private readonly workingDirectory: string
  private readonly user: string
  private readonly isDebug: boolean

  constructor({
    input,
    user,
    executor = new ExecExecutor(),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    workingDirectory = process.env['GITHUB_WORKSPACE']!,
    isDebug = core.isDebug()
  }: {
    input: Input
    user: string
    executor?: Executor
    workingDirectory?: string
    isDebug?: boolean
  }) {
    this.input = input
    this.user = user
    this.executor = executor
    this.workingDirectory = workingDirectory
    this.isDebug = isDebug
  }

  async synchronizePaths(...excludePaths: string[]): Promise<void> {
    if (!this.shouldSyncFiles) {
      return
    }

    core.debug(`Syncing files to VM, excluding: ${excludePaths}`)
    // prettier-ignore
    await this.executor.execute('rsync', [
      this.rsyncFlags,
      '--exclude', '_actions/cross-platform-actions/action',
      ...flatMap(excludePaths, p => ['--exclude', p]),
      `${this.homeDirectory}/`,
      this.rsyncTarget
    ])
  }

  async synchronizeBack(): Promise<void> {
    if (!this.shouldSyncBack) return

    core.info('Syncing back files')
    // prettier-ignore
    await this.executor.execute('rsync', [
      this.rsyncFlags,
      `${this.rsyncTarget}/`,
      this.homeDirectory
    ])
  }

  private get shouldSyncFiles(): boolean {
    return (
      this.input.syncFiles === SyncDirection.runner_to_vm ||
      this.input.syncFiles === SyncDirection.both
    )
  }

  private get shouldSyncBack(): boolean {
    return (
      this.input.syncFiles === SyncDirection.vm_to_runner ||
      this.input.syncFiles === SyncDirection.both
    )
  }

  private get rsyncFlags(): string {
    return `-auz${this.syncVerboseFlag}`
  }

  private get syncVerboseFlag(): string {
    return this.isDebug ? 'v' : ''
  }

  private get homeDirectory(): string {
    const components = this.workingDirectory.split(path.sep).slice(0, -2)
    return path.join('/', ...components)
  }

  get rsyncTarget(): string {
    return `${this.user}@${this.cpaHost}:work`
  }
}
