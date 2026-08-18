// A named, tested configuration of a platform, rather than a set of
// independent knobs. Keeping it a closed list is deliberate: every value here
// is something CI boots, and a combination nobody tests never becomes
// reachable by writing two flags at once.
export enum Variant {
  default,
  microvm
}

const stringToVariant: ReadonlyMap<string, Variant> = (() => {
  const map = new Map<string, Variant>()
  map.set('default', Variant.default)
  map.set('microvm', Variant.microvm)
  return map
})()

export function toVariant(value: string): Variant | undefined {
  return stringToVariant.get(value.toLowerCase())
}

export const validVariants = Array.from(stringToVariant.keys())

export function toString(variant: Variant): string {
  for (const [key, value] of stringToVariant) {
    if (value === variant) return key
  }

  throw Error(`Unreachable: missing Variant.${variant} in 'stringToVariant'`)
}
