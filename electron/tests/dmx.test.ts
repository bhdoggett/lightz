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

import { DmxManager } from '../dmx'

describe('DmxManager', () => {
  let manager: DmxManager

  beforeEach(() => {
    manager = new DmxManager()
  })

  describe('group overrides', () => {
    beforeEach(() => {
      manager = new DmxManager()
    })

    it('returns raw value when no override set', () => {
      manager.setChannel(0, 1, 200)
      expect(manager.getEffectiveValue(0, 1)).toBe(200)
    })

    it('full override returns 255 regardless of stored value', () => {
      manager.setChannel(0, 1, 100)
      manager.setGroupOverrides({ '0-1': { kind: 'full' } })
      expect(manager.getEffectiveValue(0, 1)).toBe(255)
    })

    it('full override returns 255 even when stored value is 0', () => {
      manager.setChannel(0, 1, 0)
      manager.setGroupOverrides({ '0-1': { kind: 'full' } })
      expect(manager.getEffectiveValue(0, 1)).toBe(255)
    })

    it('mute override returns 0 regardless of stored value', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupOverrides({ '0-1': { kind: 'mute' } })
      expect(manager.getEffectiveValue(0, 1)).toBe(0)
    })

    it('percent override multiplies stored value', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupOverrides({ '0-1': { kind: 'percent', multiplier: 0.5 } })
      expect(manager.getEffectiveValue(0, 1)).toBe(100)
    })

    it('percent override rounds fractional results', () => {
      manager.setChannel(0, 1, 3)
      manager.setGroupOverrides({ '0-1': { kind: 'percent', multiplier: 0.5 } })
      expect(manager.getEffectiveValue(0, 1)).toBe(2)
    })

    it('setGroupOverrides replaces previous map', () => {
      manager.setChannel(0, 1, 200)
      manager.setGroupOverrides({ '0-1': { kind: 'mute' } })
      manager.setGroupOverrides({ '0-2': { kind: 'mute' } })
      expect(manager.getEffectiveValue(0, 1)).toBe(200) // override gone
      expect(manager.getEffectiveValue(0, 2)).toBe(0)
    })
  })
})
