import { useCallback, useMemo, useState } from 'react'
import { RawFader } from '../components/RawFader'
import { useApi } from '../api/context'
import type { Fixture } from '../../shared/types'
import styles from './LiveView.module.css'

interface Props {
  fixtures: Fixture[]
  getChannel: (universe: 0 | 1, channel: number) => number
  setChannel: (universe: 0 | 1, channel: number, value: number) => void
  onRename: (universe: 0 | 1, channel: number, name: string) => void
}

export function LiveView({ fixtures, getChannel, setChannel, onRename }: Props) {
  const api = useApi()
  const [collapsed, setCollapsed] = useState<Record<0 | 1, boolean>>({ 0: false, 1: false })

  const fixtureByChannel = useMemo(() => {
    const map: Record<0 | 1, Record<number, Fixture>> = { 0: {}, 1: {} }
    for (const f of fixtures) {
      if (f.universe === 0 || f.universe === 1) map[f.universe][f.channel] = f
    }
    return map
  }, [fixtures])

  const handleChange = useCallback((universe: 0 | 1, channel: number, value: number) => {
    setChannel(universe, channel, value)
    api.setChannel({ universe, channel, value })
  }, [api, setChannel])

  const channels = Array.from({ length: 512 }, (_, i) => i + 1)

  return (
    <div className={styles.view}>
      {([0, 1] as const).map((u) => (
        <div key={u} className={styles.universeSection}>
          <button
            className={styles.universeLabel}
            onClick={() => setCollapsed((prev) => ({ ...prev, [u]: !prev[u] }))}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: collapsed[u] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
            Universe {u + 1}
          </button>
          {!collapsed[u] && (
            <div className={styles.strip}>
              {channels.map((ch) => (
                <RawFader
                  key={ch}
                  channel={ch}
                  universe={u}
                  value={getChannel(u, ch)}
                  label={fixtureByChannel[u][ch]?.name}
                  onChange={(v) => handleChange(u, ch, v)}
                  onRename={(name) => onRename(u, ch, name)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
