import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import type { Fixture, FixtureType } from '../../shared/types'

interface Props {
  channel: number | null
  fixture: Fixture | null
  onSave: (fixture: Fixture) => void
  onDelete: (id: string) => void
}

export function ChannelEditor({ channel, fixture, onSave, onDelete }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<FixtureType>('dimmer')
  const [universe, setUniverse] = useState<0 | 1>(0)

  useEffect(() => {
    setName(fixture?.name ?? '')
    setType(fixture?.type ?? 'dimmer')
    setUniverse(fixture?.universe ?? 0)
  }, [fixture, channel])

  if (channel === null) {
    return <div style={{ padding: 24, color: '#6b7280' }}>Select a channel from the list to edit it.</div>
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ id: fixture?.id ?? uuid(), name: name.trim(), channel, universe, type })
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
    background: active ? '#6366f1' : '#374151', color: '#fff', fontWeight: active ? 700 : 400,
  })

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 220 }}>
      <h3 style={{ margin: 0, color: '#e5e7eb' }}>Channel {channel}</h3>

      <label style={{ color: '#9ca3af', fontSize: 12 }}>
        Fixture name
        <input
          placeholder="Fixture name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: 'block', marginTop: 4, width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #374151', background: '#1e1e2e', color: '#fff' }}
        />
      </label>

      <div>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>Type</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={() => setType('dimmer')} style={btnStyle(type === 'dimmer')}>Dimmer</button>
          <button onClick={() => setType('switch')} style={btnStyle(type === 'switch')}>Switch</button>
        </div>
      </div>

      <div>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>Universe</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={() => setUniverse(0)} style={btnStyle(universe === 0)}>1</button>
          <button onClick={() => setUniverse(1)} style={btnStyle(universe === 1)}>2</button>
        </div>
      </div>

      <button onClick={handleSave} style={{ ...btnStyle(true), marginTop: 8 }}>Save</button>

      {fixture && (
        <button
          onClick={() => onDelete(fixture.id)}
          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
        >
          Remove fixture
        </button>
      )}
    </div>
  )
}
