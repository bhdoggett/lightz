import { useState, useRef, useEffect } from 'react'
import { Slider } from './Slider'
import styles from './RawFader.module.css'

interface Props {
  channel: number
  value: number
  label?: string
  onChange: (value: number) => void
  onRename?: (name: string) => void
  fillColor?: string
  groupColor?: string
  groupOverride?: 'full' | 'mute' | null
}

export function RawFader({ channel, value, label, onChange, onRename, fillColor, groupColor, groupOverride }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const startEdit = () => {
    if (!onRename) return
    setDraft(label ?? '')
    setEditing(true)
  }

  const commitEdit = () => {
    setEditing(false)
    if (onRename) onRename(draft.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div
      className={[
        styles.fader,
        groupColor ? styles.grouped : '',
        groupOverride === 'mute' ? styles.muted : '',
      ].filter(Boolean).join(' ')}
      style={groupColor ? { '--group-color': groupColor } as React.CSSProperties : undefined}
    >
      <div className={styles.valueRow}>
        <span className={`${styles.value}${value > 0 || groupOverride === 'full' ? ` ${styles.active}` : ''}`}>
          {groupOverride === 'full' ? 255 : groupOverride === 'mute' ? 0 : value}
        </span>
        {groupColor && (
          <span
            className={styles.groupDot}
            style={{ background: groupColor }}
            data-testid="group-dot"
            title="Group active"
          />
        )}
      </div>
      <Slider value={value} onChange={onChange} fillColor={groupColor ?? fillColor} disabled={groupOverride !== null && groupOverride !== undefined} />
      <button
        className={`${styles.toggleBtn}${value > 0 ? ` ${styles.on}` : ''}`}
        aria-label="toggle"
        aria-pressed={value > 0}
        onClick={() => onChange(value > 0 ? 0 : 255)}
      >
        <span
          className={styles.toggleDot}
          style={{
            background: groupOverride === 'full'
              ? 'rgba(255,255,255,1)'
              : `rgba(255,255,255,${value / 255})`,
          }}
        />
      </button>
      <div
        className={`${styles.nameArea}${onRename ? ` ${styles.renameable}` : ''}`}
        onClick={startEdit}
      >
        {editing ? (
          <input
            ref={inputRef}
            className={styles.renameInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            placeholder="name…"
            data-testid="rename-input"
          />
        ) : (
          <>
            <span className={styles.channel}>{String(channel).padStart(3, '0')}</span>
            {label && (
              <span className={styles.label} data-testid="raw-fader-label">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
