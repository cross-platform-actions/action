import * as os_kind from '../../src/operating_systems/kind'

test('toKind - valid operating system', () => {
  expect(os_kind.toKind('freebsd')).toBe(os_kind.Kind.freeBsd)
})

test('toKind - invalid operating system', () => {
  expect(os_kind.toKind('null')).toBe(undefined)
})
