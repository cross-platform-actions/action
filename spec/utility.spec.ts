import {
  execWithOutput,
  getOrDefaultOrThrow,
  getOrThrow,
  getImplementation
} from '../src/utility'

describe('execWithOutput', () => {
  it('returns the output of the executed process', async () => {
    const result = await execWithOutput('ls')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('getOrDefaultOrThrow', () => {
  it('returns the value of the given key', () => {
    let record = {foo: 4}
    expect(getOrDefaultOrThrow(record, 'foo')).toBe(4)
  })

  describe("when the key doesn't exists", () => {
    describe('when a default value is specified', () => {
      it('retusn the default value', () => {
        let record = {foo: 4, default: 5}
        expect(getOrDefaultOrThrow(record, 'bar')).toBe(5)
      })
    })

    describe('when a default value is not specified', () => {
      it('throws an error', () => {
        let record = {foo: 4}
        expect(() => getOrDefaultOrThrow(record, 'bar')).toThrowError(
          /^Missing key and no default key/
        )
      })
    })
  })
})

describe('getOrThrow', () => {
  it('returns the value of the given key', () => {
    let map = new Map([['foo', 3]])
    expect(getOrThrow(map, 'foo')).toBe(3)
  })

  describe("when the given key doesn't exist", () => {
    it('throws an error', () => {
      let map = new Map([['foo', 3]])
      expect(() => getOrThrow(map, 'bar')).toThrowError(/^Key not found/)
    })
  })
})

describe('getImplementation', () => {
  describe('when the implementation matches', () => {
    it('returns the value of the implementation', () => {
      class Foo {}
      expect(getImplementation(new Foo(), {foo: 3})).toBe(3)
    })
  })

  describe("when the implementation doesn't match", () => {
    describe('when a default implementation is provided', () => {
      it('returns teh default implementation', () => {
        class Foo {}
        expect(getImplementation(new Foo(), {bar: 3, default: 4})).toBe(4)
      })
    })

    describe('when no default implementation is provided', () => {
      it('throws an error', () => {
        class Foo {}
        expect(() => getImplementation(new Foo(), {bar: 3})).toThrowError
      })
    })
  })
})
