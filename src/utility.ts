import * as exec from '@actions/exec'

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
