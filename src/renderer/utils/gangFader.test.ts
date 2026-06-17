import { describe, it, expect } from 'vitest'
import { computeMasterValue, applyMasterGang } from './gangFader'
import type { FixtureChannel } from '../../shared/types'

const linked = (id: string, channel = 1): FixtureChannel => ({
  id, role: 'red', label: 'Red', channel, universe: 0, linked: true,
})
const unlinked = (id: string, channel = 1): FixtureChannel => ({
  id, role: 'strobe', label: 'Strobe', channel, universe: 0, linked: false,
})

describe('computeMasterValue', () => {
  it('returns average of linked channel values', () => {
    const channels = [linked('r'), linked('g', 2), linked('b', 3)]
    const values = { r: 200, g: 100, b: 50 }
    // avg = (200+100+50)/3 = 116.67 → rounds to 117
    expect(computeMasterValue(channels, values)).toBe(117)
  })

  it('ignores unlinked channels', () => {
    const channels = [linked('r'), unlinked('s')]
    const values = { r: 100, s: 255 }
    expect(computeMasterValue(channels, values)).toBe(100)
  })

  it('returns 0 when no linked channels', () => {
    expect(computeMasterValue([unlinked('s')], { s: 255 })).toBe(0)
  })
})

describe('applyMasterGang', () => {
  it('scales linked channels proportionally', () => {
    const channels = [linked('r'), linked('g', 2)]
    const values = { r: 200, g: 100 }
    // master = 150, scale to 75 = ratio 0.5 → r:100, g:50
    const result = applyMasterGang(channels, values, 75)
    expect(result.r).toBe(100)
    expect(result.g).toBe(50)
  })

  it('does not affect unlinked channels', () => {
    const channels = [linked('r'), unlinked('s', 2)]
    const values = { r: 200, s: 100 }
    const result = applyMasterGang(channels, values, 0)
    expect(result.r).toBe(0)
    expect(result.s).toBe(100)
  })

  it('enforces ceiling — clamps at 255', () => {
    const channels = [linked('r'), linked('g', 2)]
    const values = { r: 200, g: 100 }
    // master = 150, try to go to 300 → r would hit 255 first at ratio 255/200=1.275
    // clampedRatio = 1.275 → r=255, g=127
    const result = applyMasterGang(channels, values, 300)
    expect(result.r).toBe(255)
    expect(result.g).toBe(127)
  })

  it('enforces floor — goes to 0', () => {
    const channels = [linked('r'), linked('g', 2)]
    const values = { r: 200, g: 100 }
    const result = applyMasterGang(channels, values, 0)
    expect(result.r).toBe(0)
    expect(result.g).toBe(0)
  })

  it('distributes evenly when all linked channels are at 0', () => {
    const channels = [linked('r'), linked('g', 2)]
    const values = { r: 0, g: 0 }
    const result = applyMasterGang(channels, values, 100)
    expect(result.r).toBe(100)
    expect(result.g).toBe(100)
  })
})
