import * as core from '@actions/core'

import {Input} from '../../src/action/input'
import {Host} from '../../src/host'
import {
  Variant,
  toVariant,
  toString,
  validVariants
} from '../../src/action/variant'

describe('Variant', () => {
  describe('toVariant', () => {
    it('converts the name of a variant', () => {
      expect(toVariant('microvm')).toEqual(Variant.microvm)
    })

    it('ignores case, like the other inputs do', () => {
      expect(toVariant('MicroVM')).toEqual(Variant.microvm)
    })

    it('returns undefined for a name that is not a variant', () => {
      expect(toVariant('nonexistent')).toBeUndefined()
    })
  })

  describe('toString', () => {
    it('converts a variant back to its name', () => {
      expect(toString(Variant.default)).toEqual('default')
    })
  })

  it('lists the valid variants, for error messages', () => {
    expect(validVariants).toEqual(['default', 'microvm'])
  })
})

describe('the variant input', () => {
  let input: Input

  let stubInput = (value: string): void => {
    spyOn(core, 'getInput').and.returnValue(value)
  }

  beforeEach(() => (input = new Input(Host.create('linux'))))

  // Unset is the same as asking for the default, so that adding a variant to
  // a platform never changes what an existing workflow boots.
  it('defaults to the default variant', () => {
    stubInput('')

    expect(input.variant).toEqual(Variant.default)
  })

  it('reads the variant that was asked for', () => {
    stubInput('microvm')

    expect(input.variant).toEqual(Variant.microvm)
  })

  it('rejects a variant that does not exist, listing the ones that do', () => {
    stubInput('nonexistent')

    expect(() => input.variant).toThrowError(
      /Invalid variant: nonexistent[\s\S]*default, microvm/
    )
  })
})
