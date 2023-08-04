import * as architecture from '../src/architecture'

describe('toKind', () => {
  describe('arm64', () => {
    it('returns the arm64 architecture', () => {
      expect(architecture.toKind('arm64')).toBe(architecture.Kind.arm64)
    })
  })

  describe('ARM64', () => {
    it('returns the arm64 architecture', () => {
      expect(architecture.toKind('ARM64')).toBe(architecture.Kind.arm64)
    })
  })

  describe('x86-64', () => {
    it('returns the x86_64 architecture', () => {
      expect(architecture.toKind('x86-64')).toBe(architecture.Kind.x86_64)
    })
  })

  describe('x86_64', () => {
    it('returns the x86_64 architecture', () => {
      expect(architecture.toKind('x86_64')).toBe(architecture.Kind.x86_64)
    })
  })

  describe('X64', () => {
    it('returns the x86_64 architecture', () => {
      expect(architecture.toKind('x64')).toBe(architecture.Kind.x86_64)
    })
  })

  describe('X86_64', () => {
    it('returns the x86_64 architecture', () => {
      expect(architecture.toKind('X86_64')).toBe(architecture.Kind.x86_64)
    })
  })

  describe('invalid architecture', () => {
    it('returns undefined', () => {
      expect(architecture.toKind('null')).toBeUndefined()
    })
  })
})
