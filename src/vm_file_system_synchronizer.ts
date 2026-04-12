import * as core from '@actions/core'

import flatMap from 'array.prototype.flatmap'

import {Executor, ExecExecutor} from './utility'
import {Input} from './action/input'
import {SyncDirection} from './action/sync_direction'
import * as vm from './vm'

export interface Command {
  program: string
  args: string[]
}

export function commandToShellString(command: Command): string {
  return [command.program, ...command.args].map(a => shellQuote(a)).join(' ')
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9_./:@=-]+$/.test(value)) return value
  return `'${value.split("'").join("'\\''")}'`
}

export interface VmFileSystemSynchronizer {
  synchronizePathsCommand(...excludePaths: string[]): Command
  synchronizeBackCommand(): Command
  synchronizePaths(...excludePaths: string[]): Promise<void>
  synchronizeBack(): Promise<void>
}

export class DefaultVmFileSystemSynchronizer
  implements VmFileSystemSynchronizer
{
  private readonly executor: Executor
  private readonly input: Input
  private readonly cpaHost = vm.Vm.cpaHost
  private readonly guestHomeDirectory: string
  private readonly hostHomeDirectory: string
  private readonly user: string
  private readonly isDebug: boolean

  constructor({
    input,
    user,
    guestHomeDirectory,
    hostHomeDirectory,
    executor = new ExecExecutor(),
    isDebug = core.isDebug()
  }: {
    input: Input
    user: string
    guestHomeDirectory: string
    hostHomeDirectory: string
    executor?: Executor
    isDebug?: boolean
  }) {
    this.input = input
    this.user = user
    this.executor = executor
    this.guestHomeDirectory = guestHomeDirectory
    this.hostHomeDirectory = hostHomeDirectory
    this.isDebug = isDebug
  }

  synchronizePathsCommand(...excludePaths: string[]): Command {
    return {
      program: 'rsync',
      // prettier-ignore
      args: [
        this.rsyncFlags,
        '--exclude', '_actions/cross-platform-actions/action',
        ...flatMap(excludePaths, p => ['--exclude', p]),
        toDirectoryPath(this.hostHomeDirectory),
        stripDirectoryPath(this.rsyncTarget)
      ]
    }
  }

  synchronizeBackCommand(): Command {
    return {
      program: 'rsync',
      args: [
        this.rsyncFlags,
        toDirectoryPath(this.rsyncTarget),
        stripDirectoryPath(this.hostHomeDirectory)
      ]
    }
  }

  async synchronizePaths(...excludePaths: string[]): Promise<void> {
    if (!this.shouldSyncFiles) {
      return
    }

    core.debug(`Syncing files to VM, excluding: ${excludePaths}`)
    const cmd = this.synchronizePathsCommand(...excludePaths)
    await this.executor.execute(cmd.program, cmd.args)
  }

  async synchronizeBack(): Promise<void> {
    if (!this.shouldSyncBack) return

    core.info('Syncing back files')
    const cmd = this.synchronizeBackCommand()
    await this.executor.execute(cmd.program, cmd.args)
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

  get rsyncTarget(): string {
    return `${this.user}@${this.cpaHost}:${this.guestHomeDirectory}`
  }
}

function toDirectoryPath(path: string): string {
  return path.endsWith('/') ? path : `${path}/`
}

function stripDirectoryPath(path: string): string {
  return path.endsWith('/') ? path.slice(0, -1) : path
}
