import * as exec from '@actions/exec'
import * as core from '@actions/core'

export type Class<T> = new (...args: any[]) => T

export interface ExecuteOptions {
  log?: boolean
  ignoreReturnCode?: boolean
  silent?: boolean
}

export async function execWithOutput(
  commandLine: string,
  args?: string[],
  options: ExecuteOptions = {}
): Promise<string> {
  let output = ''

  const exitCode = await exec.exec(commandLine, args, {
    silent: options.silent,
    ignoreReturnCode: options.ignoreReturnCode,
    listeners: {
      stdout: buffer => (output += buffer.toString())
    }
  })

  if (exitCode !== 0)
    throw Error(`Failed to executed command: ${commandLine} ${args?.join(' ')}`)

  return output.toString()
}

export function getOrDefaultOrThrow<V>(
  record: Record<string, V>,
  key: string
): V {
  const value = record[key] ?? record['default']

  if (value === undefined) throw Error(`Missing key and no default key: ${key}`)

  return value
}

export function getOrThrow<Key, Value>(
  map: ReadonlyMap<Key, Value>,
  key: Key
): Value {
  const value = map.get(key)

  if (value === undefined) throw new Error(`Key not found: ${key}`)

  return value
}

export function getImplementation<T>(
  object: Object,
  implementation: Record<string, T>
): T {
  const name = object.constructor.name.toLocaleLowerCase()
  return getOrDefaultOrThrow(implementation, name)
}

export function group(name: string, block: () => void): void {
  try {
    core.startGroup(name)
    block()
  } finally {
    core.endGroup()
  }
}

export interface Executor {
  execute(
    commandLine: string,
    args?: string[],
    options?: exec.ExecOptions
  ): Promise<number>
}

export class ExecExecutor implements Executor {
  async execute(
    commandLine: string,
    args?: string[],
    options?: exec.ExecOptions
  ): Promise<number> {
    return await exec.exec(commandLine, args, options)
  }
}
