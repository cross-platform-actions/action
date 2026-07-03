// Only append new kinds: the numeric enum value is part of the input hash
// that is persisted across action invocations (Input.toHash), so renumbering
// existing kinds breaks jobs that mix action versions.
export enum Kind {
  arm64,
  x86_64,
  riscv64,
  vax
}

export function toKind(value: string): Kind | undefined {
  return architectureMap[value.toLocaleLowerCase()]
}

const architectureMap: Record<string, Kind> = {
  arm64: Kind.arm64,
  aarch64: Kind.arm64,
  'x86-64': Kind.x86_64,
  x86_64: Kind.x86_64,
  x64: Kind.x86_64,
  riscv64: Kind.riscv64,
  riscv: Kind.riscv64,
  rv64: Kind.riscv64,
  vax: Kind.vax
} as const
