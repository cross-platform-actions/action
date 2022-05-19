export enum Shell {
  default,
  bash,
  sh
}
const stringToShell: ReadonlyMap<string, Shell> = (() => {
  const map = new Map<string, Shell>()
  map.set('default', Shell.default)
  map.set('bash', Shell.bash)
  map.set('sh', Shell.sh)
  return map
})()

export function toShell(value: string): Shell | undefined {
  return stringToShell.get(value.toLowerCase())
}

export function toString(shell: Shell): string {
  for (const [key, value] of stringToShell) {
    if (value === shell) return key
  }

  throw Error(`Unreachable: missing Shell.${shell} in 'stringToShell'`)
}
