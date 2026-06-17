import { useState, useCallback } from 'react'

type ChannelKey = string

export function useDmxState() {
  const [channels, setChannels] = useState<Record<ChannelKey, number>>({})

  const setChannel = useCallback((universe: 0 | 1, channel: number, value: number) => {
    setChannels((prev) => ({ ...prev, [`${universe}-${channel}`]: value }))
  }, [])

  const getChannel = useCallback(
    (universe: 0 | 1, channel: number): number => {
      return channels[`${universe}-${channel}`] ?? 0
    },
    [channels]
  )

  const applyScene = useCallback(
    (values: Record<string, number>, fixtures: import('../../shared/types').Fixture[]) => {
      const next: Record<ChannelKey, number> = {}
      for (const [id, value] of Object.entries(values)) {
        // Single-channel fixture
        const f = fixtures.find((f) => f.id === id)
        if (f && !f.channels) {
          next[`${f.universe}-${f.channel}`] = value
          continue
        }
        // Multi-channel sub-channel
        for (const fixture of fixtures) {
          if (!fixture.channels) continue
          const ch = fixture.channels.find((c) => c.id === id)
          if (ch) {
            next[`${ch.universe}-${ch.channel}`] = value
            break
          }
        }
      }
      setChannels((prev) => ({ ...prev, ...next }))
    },
    []
  )

  return { channels, setChannel, getChannel, applyScene }
}
