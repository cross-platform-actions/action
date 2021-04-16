import * as os from '../src/operating_system'

test('toKind - valid operating system', () => {
  expect(os.toKind('freebsd')).toBe(os.Kind.freeBsd)
})

test('toKind - invalid operating system', () => {
  expect(os.toKind('null')).toBe(undefined)
})

test('toString(Architecture) - arm64', () => {
  expect(os.toString(os.Architecture.arm64)).toBe('arm64')
})

test('toString(Architecture) - x86_64', () => {
  expect(os.toString(os.Architecture.x86_64)).toBe('x86-64')
})
