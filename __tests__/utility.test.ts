import {
  execWithOutput,
  getOrDefaultOrThrow,
  getOrThrow,
  getImplementation
} from '../src/utility'

test('execWithOutput', async () => {
  const result = await execWithOutput('ls')
  expect(result.length).toBeGreaterThan(0)
})

test('getOrDefaultOrThrow', () => {
  let record = {foo: 4}
  expect(getOrDefaultOrThrow(record, 'foo')).toBe(4)
})

test('getOrDefaultOrThrow - default', () => {
  let record = {foo: 4, default: 5}
  expect(getOrDefaultOrThrow(record, 'bar')).toBe(5)
})

test('getOrDefaultOrThrow - throw', () => {
  let record = {foo: 4}
  expect(() => getOrDefaultOrThrow(record, 'bar')).toThrowError(
    /^Missing key and no default key/
  )
})

test('getOrThrow', () => {
  let map = new Map([['foo', 3]])
  expect(getOrThrow(map, 'foo')).toBe(3)
})

test('getOrThrow - throw', () => {
  let map = new Map([['foo', 3]])
  expect(() => getOrThrow(map, 'bar')).toThrowError(/^Key not found/)
})

test('getImplementation - matching implementation', () => {
  class Foo {}
  expect(getImplementation(new Foo(), {foo: 3})).toBe(3)
})

test('getImplementation - default implementation', () => {
  class Foo {}
  expect(getImplementation(new Foo(), {bar: 3, default: 4})).toBe(4)
})

test('getImplementation - no matching implementation', () => {
  class Foo {}
  expect(() => getImplementation(new Foo(), {bar: 3})).toThrowError
})
