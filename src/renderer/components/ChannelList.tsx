import { useMemo } from 'react'
import type { Fixture } from '../../shared/types'

interface Props {
  fixtures: Fixture[]
  channelValues: Record<string, number>
  selectedChannel: number | null
  onSelect: (channel: number) => void
}

export function ChannelList({ fixtures, channelValues, selectedChannel, onSelect }: Props) {
  const fixtureByChannel = useMemo(() => {
    const map: Record<number, Fixture> = {}
    for (const f of fixtures) map[f.channel] = f
    return map
  }, [fixtures])

  return (
    <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
      {Array.from({ length: 512 }, (_, i) => i + 1).map((ch) => {
        const fixture = fixtureByChannel[ch]
        const valueKey = `0-${ch}`
        const value = channelValues[valueKey] ?? 0
        const isSelected = selectedChannel === ch
        return (
          <div
            key={ch}
            onClick={() => onSelect(ch)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px',
              cursor: 'pointer', background: isSelected ? '#2a2a3e' : 'transparent',
              borderLeft: isSelected ? '2px solid #6366f1' : '2px solid transparent',
            }}
          >
            <span style={{ color: '#6b7280', width: 28 }}>{String(ch).padStart(3, '0')}</span>
            <div style={{ flex: 1, height: 6, background: '#1e1e2e', borderRadius: 3 }}>
              <div style={{ width: `${(value / 255) * 100}%`, height: '100%', background: '#6366f1', borderRadius: 3 }} />
            </div>
            <span style={{ color: fixture ? '#e5e7eb' : '#4b5563', fontStyle: fixture ? 'normal' : 'italic', minWidth: 120 }}>
              {fixture ? fixture.name : 'unlabeled'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
