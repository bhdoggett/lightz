import { describe, it, expect } from 'vitest'
import { getUsedChannels, isStartChannelAvailable, describeConflict } from './fixtureChannelAvailability'
import type { Fixture } from '../../shared/types'

const singleChannelFixture = (id: string, channel: number, universe: 0 | 1 = 0): Fixture => ({
  id, name: id, channel, universe, type: 'dimmer',
})

const multiChannelFixture = (id: string, startChannel: number, count: number, universe: 0 | 1 = 0): Fixture => ({
  id, name: id, channel: startChannel, universe, type: 'dimmer',
  channels: Array.from({ length: count }, (_, i) => ({
    id: `${id}-ch${i}`, role: 'other', label: `Ch${i}`, linked: false,
    channel: startChannel + i, universe,
  })),
})

describe('getUsedChannels', () => {
  it('includes the primary channel of a legacy single-channel fixture', () => {
    const used = getUsedChannels([singleChannelFixture('a', 5)], 0)
    expect(used.has(5)).toBe(true)
  })

  it('expands all channels of a multi-channel fixture', () => {
    const used = getUsedChannels([multiChannelFixture('a', 10, 4)], 0)
    expect([...used].sort((x, y) => x - y)).toEqual([10, 11, 12, 13])
  })

  it('ignores fixtures on a different universe', () => {
    const used = getUsedChannels([singleChannelFixture('a', 5, 1)], 0)
    expect(used.has(5)).toBe(false)
  })

  it('excludes the fixture matching excludeId', () => {
    const used = getUsedChannels([multiChannelFixture('a', 10, 4)], 0, 'a')
    expect(used.size).toBe(0)
  })
})

describe('isStartChannelAvailable', () => {
  it('is true when the full range is free', () => {
    const used = new Set([1, 2, 3])
    expect(isStartChannelAvailable(10, 4, used)).toBe(true)
  })

  it('is false when any channel in the range is used', () => {
    const used = new Set([12])
    expect(isStartChannelAvailable(10, 4, used)).toBe(false)
  })

  it('is false when the range runs past channel 512', () => {
    const used = new Set<number>()
    expect(isStartChannelAvailable(510, 4, used)).toBe(false)
  })

  it('is true for a single-channel range on a free channel', () => {
    const used = new Set([1, 2, 3])
    expect(isStartChannelAvailable(4, 1, used)).toBe(true)
  })
})

describe('describeConflict', () => {
  it('reports the first used channel in the range', () => {
    const used = new Set([12])
    expect(describeConflict(10, 4, used)).toBe('Channel 12 is already taken')
  })

  it('reports overflow past channel 512', () => {
    const used = new Set<number>()
    expect(describeConflict(510, 4, used)).toBe('Not enough channels available before 512')
  })

  it('returns empty string when the range is fully available', () => {
    const used = new Set([1, 2, 3])
    expect(describeConflict(10, 4, used)).toBe('')
  })
})
