export enum Kind {
  freeBsd,
  netBsd,
  openBsd
}

export function toKind(value: string): Kind | undefined {
  return stringToKind.get(value.toLowerCase())
}

const stringToKind: ReadonlyMap<string, Kind> = (() => {
  const map = new Map<string, Kind>()
  map.set('freebsd', Kind.freeBsd)
  map.set('netbsd', Kind.netBsd)
  map.set('openbsd', Kind.openBsd)
  return map
})()
