import * as architecture from '../src/architecture'

test('toKind(string) - arm64', () => {
  expect(architecture.toKind('arm64')).toBe(architecture.Kind.arm64)
})

test('toKind(string) - ARM64', () => {
  expect(architecture.toKind('arm64')).toBe(architecture.Kind.arm64)
})

test('toKind(string) - x86_64', () => {
  expect(architecture.toKind('x86-64')).toBe(architecture.Kind.x86_64)
})

test('toKind(string) - X86_64', () => {
  expect(architecture.toKind('x86-64')).toBe(architecture.Kind.x86_64)
})

test('toKind(string) - invalid architecture', () => {
  expect(architecture.toKind('null')).toBe(undefined)
})
