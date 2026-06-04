import { useState, useRef, useEffect } from 'react'
import styles from './RawFader.module.css'

interface Props {
  channel: number
  value: number
  label?: string
  onChange: (value: number) => void
  onRename?: (name: string) => void
}

export function RawFader({ channel, value, label, onChange, onRename }: Props) {
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
    const name = draft.trim()
    if (name && onRename) onRename(name)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className={styles.fader}>
      <span className={`${styles.value}${value > 0 ? ` ${styles.active}` : ''}`}>
        {value}
      </span>
      <input
        type="range"
        role="slider"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
      />
      <div className={styles.buttons}>
        <button className={styles.maxBtn} aria-label="max" onClick={() => onChange(255)}>○</button>
        <button className={styles.offBtn} aria-label="off" onClick={() => onChange(0)}>✕</button>
      </div>
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
