import * as exec from '@actions/exec'

export type Class<T> = new () => T

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

export function getOrDefaultOrThrow<V>(record: Record<string, V>, key: string) {
  const value = record[key] ?? record['default']

  if (value === undefined) throw Error(`Missing key and no default key: ${key}`)

  return value
}

export function getOrThrow<Key, Value>(map: ReadonlyMap<Key, Value>, key: Key) {
  const value = map.get(key)

  if (value === undefined) throw new Error(`Key not found: ${key}`)

  return value
}
