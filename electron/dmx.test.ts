// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('serialport', () => {
  const SerialPort = vi.fn().mockImplementation(() => ({
    isOpen: false,
    writable: false,
    close: vi.fn(),
    write: vi.fn(),
    drain: vi.fn(),
  }))
  return { SerialPort }
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

  describe('group multipliers', () => {
    beforeEach(() => {
      manager = new DmxManager()
    })

    it('returns raw value when no multiplier set', () => {
      manager.setChannel(0, 1, 200)
      expect(manager.getEffectiveValue(0, 1)).toBe(200)
    })

    it('applies multiplier to stored value', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupMultipliers({ '0-1': 0.5 })
      expect(manager.getEffectiveValue(0, 1)).toBe(100)
    })

    it('multiplier of 0 returns 0', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupMultipliers({ '0-1': 0 })
      expect(manager.getEffectiveValue(0, 1)).toBe(0)
    })

    it('multiplier of 1.0 returns full value', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupMultipliers({ '0-1': 1.0 })
      expect(manager.getEffectiveValue(0, 1)).toBe(200)
    })

    it('rounds fractional results', () => {
      manager.setChannel(0, 1, 3)
      manager.setGroupMultipliers({ '0-1': 0.5 })
      expect(manager.getEffectiveValue(0, 1)).toBe(2) // Math.round(1.5) = 2
    })

    it('setGroupMultipliers replaces previous map', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupMultipliers({ '0-1': 0.5 })
      manager.setGroupMultipliers({ '0-2': 0.5 }) // channel 1 multiplier gone
      expect(manager.getEffectiveValue(0, 1)).toBe(200) // back to full
      expect(manager.getEffectiveValue(0, 2)).toBe(0)   // channel 2 was never set
    })
  })
})
