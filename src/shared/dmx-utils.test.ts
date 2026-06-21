import { describe, it, expect } from 'vitest'
import { interpolate, clampValue } from './dmx-utils'

describe('interpolate', () => {
  it('returns start at progress 0', () => {
    expect(interpolate(0, 255, 0)).toBe(0)
  })

  it('returns end at progress 1', () => {
    expect(interpolate(0, 255, 1)).toBe(255)
  })

  it('returns midpoint at progress 0.5', () => {
    expect(interpolate(0, 200, 0.5)).toBe(100)
  })

  it('clamps progress above 1', () => {
    expect(interpolate(0, 100, 1.5)).toBe(100)
  })
})

describe('clampValue', () => {
  it('clamps below 0', () => {
    expect(clampValue(-10)).toBe(0)
  })

  it('clamps above 255', () => {
    expect(clampValue(300)).toBe(255)
  })

  it('passes through valid values', () => {
    expect(clampValue(128)).toBe(128)
  })
})
