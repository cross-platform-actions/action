import * as exec from '@actions/exec'
import * as core from '@actions/core'

// `any[]` is required here: this generic constructor type backs a
// heterogeneous class registry whose implementations have differing
// constructor parameters, and both `unknown[]` and `never[]` break either
// the registry assignments or the `new cls(...)` call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Class<T> = new (...args: any[]) => T

export interface ExecuteOptions {
  log?: boolean
  ignoreReturnCode?: boolean
  silent?: boolean
  // Overrides the SSH configuration's ConnectTimeout, in seconds, for this
  // invocation only.
  connectTimeout?: number
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

// Parses a QEMU `-m` memory string (e.g. '6G', '2048M', '512') into a number
// of mebibytes. A unitless value is interpreted as mebibytes, matching QEMU's
// default. Returns undefined when the value cannot be parsed.
export function mebibytes(memory: string): number | undefined {
  const match = memory.trim().match(/^(\d+)\s*([kmg]?)i?b?$/i)
  if (match === null) return undefined

  const value = parseInt(match[1], 10)

  switch (match[2].toLocaleLowerCase()) {
    case 'g':
      return value * 1024
    case 'k':
      return Math.floor(value / 1024)
    default:
      return value
  }
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
