import { describe, it, expect } from 'vitest'
import { channelValuesToDisplayHex, pickerHexToChannelValues, isColorRole } from './colorSync'
import type { FixtureChannel } from '../../shared/types'

const ch = (id: string, role: FixtureChannel['role']): FixtureChannel => ({
  id, role, label: role, channel: 1, universe: 0, linked: true,
})

describe('isColorRole', () => {
  it('returns true for color roles', () => {
    expect(isColorRole('red')).toBe(true)
    expect(isColorRole('amber')).toBe(true)
    expect(isColorRole('uv')).toBe(true)
  })
  it('returns false for non-color roles', () => {
    expect(isColorRole('strobe')).toBe(false)
    expect(isColorRole('other')).toBe(false)
  })
})

describe('channelValuesToDisplayHex', () => {
  it('pure red channel at 255 → #ff0000', () => {
    const channels = [ch('r', 'red')]
    expect(channelValuesToDisplayHex(channels, { r: 255 })).toBe('#ff0000')
  })

  it('white channel at 255 → #ffffff', () => {
    const channels = [ch('w', 'white')]
    expect(channelValuesToDisplayHex(channels, { w: 255 })).toBe('#ffffff')
  })

  it('all channels at 0 → #000000', () => {
    const channels = [ch('r', 'red'), ch('g', 'green'), ch('b', 'blue')]
    expect(channelValuesToDisplayHex(channels, { r: 0, g: 0, b: 0 })).toBe('#000000')
  })

  it('ignores non-color channels', () => {
    const channels = [ch('r', 'red'), ch('s', 'strobe')]
    expect(channelValuesToDisplayHex(channels, { r: 255, s: 255 })).toBe('#ff0000')
  })
})

describe('pickerHexToChannelValues', () => {
  it('maps red hex to red channel', () => {
    const channels = [ch('r', 'red'), ch('g', 'green'), ch('b', 'blue')]
    const result = pickerHexToChannelValues('#ff0000', channels)
    expect(result.r).toBe(255)
    expect(result.g).toBe(0)
    expect(result.b).toBe(0)
  })

  it('derives amber from warm color', () => {
    const channels = [ch('r', 'red'), ch('a', 'amber')]
    // #ff8000 = R:255 G:128 B:0 → warmth = 255 - max(128, 0) = 127
    const result = pickerHexToChannelValues('#ff8000', channels)
    expect(result.r).toBe(255)
    expect(result.a).toBe(127)
  })

  it('derives white from neutral color', () => {
    const channels = [ch('w', 'white'), ch('r', 'red'), ch('g', 'green'), ch('b', 'blue')]
    // #808080 = R:128 G:128 B:128 → neutral = min(128,128,128) = 128
    const result = pickerHexToChannelValues('#808080', channels)
    expect(result.w).toBe(128)
  })

  it('does not update uv channel (leaves it absent)', () => {
    const channels = [ch('r', 'red'), ch('uv', 'uv')]
    const result = pickerHexToChannelValues('#ff0000', channels)
    expect(result.r).toBe(255)
    expect('uv' in result).toBe(false)
  })

  it('ignores non-color channels', () => {
    const channels = [ch('r', 'red'), ch('s', 'strobe')]
    const result = pickerHexToChannelValues('#ff0000', channels)
    expect('s' in result).toBe(false)
  })
})
