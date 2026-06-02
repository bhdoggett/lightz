import { useMemo } from 'react'
import type { Fixture } from '../../shared/types'
import styles from './ChannelList.module.css'

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
    <div className={styles.list}>
      {Array.from({ length: 512 }, (_, i) => i + 1).map((ch) => {
        const fixture = fixtureByChannel[ch]
        const value = channelValues[`0-${ch}`] ?? 0
        const isSelected = selectedChannel === ch
        return (
          <div
            key={ch}
            onClick={() => onSelect(ch)}
            className={`${styles.row}${isSelected ? ` ${styles.selected}` : ''}`}
          >
            <span className={styles.num}>{String(ch).padStart(3, '0')}</span>
            <div className={styles.bar}>
              <div className={styles.barFill} style={{ width: `${(value / 255) * 100}%` }} />
            </div>
            <span className={`${styles.label}${!fixture ? ` ${styles.unlabeled}` : ''}`}>
              {fixture ? fixture.name : 'unlabeled'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
