import * as os from '../src/operating_system'

test('toKind - valid operating system', () => {
  expect(os.toKind('freebsd')).toBe(os.Kind.freeBsd)
})

test('toKind - invalid operating system', () => {
  expect(os.toKind('null')).toBe(undefined)
})
