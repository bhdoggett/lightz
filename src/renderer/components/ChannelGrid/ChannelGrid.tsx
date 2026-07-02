import type { CSSProperties } from 'react'
import styles from './ChannelGrid.module.css'

export interface ChannelCell {
  className?: string
  style?: CSSProperties
  title: string
}

interface Props {
  label: string
  onCellClick: (channel: number) => void
  getCell: (channel: number) => ChannelCell
}

export function ChannelGrid({ label, onCellClick, getCell }: Props) {
  return (
    <div>
      <div className={styles.gridLabel}>{label}</div>
      <div className={styles.grid}>
        {Array.from({ length: 512 }, (_, i) => i + 1).map((ch) => {
          const { className, style, title } = getCell(ch)
          return (
            <div
              key={ch}
              className={[styles.cell, className].filter(Boolean).join(' ')}
              style={style}
              onClick={() => onCellClick(ch)}
              title={title}
            >
              {ch}
            </div>
          )
        })}
      </div>
    </div>
  )
}
