// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('dmx', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      addUniverse: vi.fn().mockReturnValue({}),
      update: vi.fn(),
    })),
  }
})

import { DmxManager } from './dmx'

describe('DmxManager', () => {
  let manager: DmxManager

  beforeEach(() => {
    manager = new DmxManager()
  })

  describe('interpolate', () => {
    it('returns start value at progress 0', () => {
      expect(manager.interpolate(0, 255, 0)).toBe(0)
    })

    it('returns end value at progress 1', () => {
      expect(manager.interpolate(0, 255, 1)).toBe(255)
    })

    it('returns midpoint at progress 0.5', () => {
      expect(manager.interpolate(0, 200, 0.5)).toBe(100)
    })

    it('clamps progress above 1', () => {
      expect(manager.interpolate(0, 255, 1.5)).toBe(255)
    })

    it('rounds to integer', () => {
      expect(manager.interpolate(0, 3, 0.5)).toBe(2)
    })
  })

  describe('clampValue', () => {
    it('clamps below 0', () => {
      expect(manager.clampValue(-10)).toBe(0)
    })

    it('clamps above 255', () => {
      expect(manager.clampValue(300)).toBe(255)
    })

    it('passes through valid values', () => {
      expect(manager.clampValue(128)).toBe(128)
    })
  })
})
