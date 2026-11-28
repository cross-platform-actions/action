import {
  execWithOutput,
  getOrDefaultOrThrow,
  getOrThrow,
  getImplementation,
  mebibytes,
  capMemory
} from '../src/utility'

describe('capMemory', () => {
  it('caps memory above the maximum at the maximum, in mebibytes', () => {
    expect(capMemory('6G', 3583)).toEqual('3583M')
  })

  it('leaves memory at the maximum unchanged', () => {
    expect(capMemory('3583M', 3583)).toEqual('3583M')
  })

  it('leaves memory below the maximum as it was written', () => {
    expect(capMemory('2G', 3583)).toEqual('2G')
  })

  it('passes a value it cannot parse on unchanged', () => {
    expect(capMemory('lots', 3583)).toEqual('lots')
  })
})

describe('mebibytes', () => {
  it('converts gibibytes to mebibytes', () => {
    expect(mebibytes('6G')).toBe(6144)
  })

  it('returns mebibytes unchanged', () => {
    expect(mebibytes('2048M')).toBe(2048)
  })

  it('treats a unitless value as mebibytes', () => {
    expect(mebibytes('512')).toBe(512)
  })

  it('converts kibibytes to mebibytes', () => {
    expect(mebibytes('4096K')).toBe(4)
  })

  it('returns undefined for an unparseable value', () => {
    expect(mebibytes('lots')).toBeUndefined()
  })
})

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
