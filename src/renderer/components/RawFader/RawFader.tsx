import { useState, useRef, useEffect } from 'react'
import { Slider } from '../Slider'
import styles from './RawFader.module.css'

interface Props {
  channel?: number
  universe?: 0 | 1
  value: number
  label?: string
  onChange: (value: number) => void
  onRename?: (name: string) => void
  fillColor?: string
  groupColor?: string
  groupMultiplier?: number
}

export function RawFader({ channel, universe, value, label, onChange, onRename, fillColor, groupColor, groupMultiplier }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [editingValue, setEditingValue] = useState(false)
  const [valueDraft, setValueDraft] = useState('')
  const valueInputRef = useRef<HTMLInputElement>(null)

  const [groupLocked, setGroupLocked] = useState(false)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  useEffect(() => {
    if (editingValue) valueInputRef.current?.select()
  }, [editingValue])

  const isGroupScaling = groupMultiplier !== undefined && groupMultiplier < 1
  const displayedValue = isGroupScaling ? Math.round(value * groupMultiplier) : value

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

  const startValueEdit = () => {
    if (isGroupScaling) {
      setGroupLocked(false)
      requestAnimationFrame(() => setGroupLocked(true))
      return
    }
    setValueDraft(String(value))
    setEditingValue(true)
  }

  const commitValueEdit = () => {
    setEditingValue(false)
    if (valueDraft.trim() === '') {
      onChange(0)
      return
    }
    const parsed = parseInt(valueDraft, 10)
    if (isNaN(parsed)) return
    onChange(Math.max(0, Math.min(255, parsed)))
  }

  const handleValueKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitValueEdit()
    if (e.key === 'Escape') setEditingValue(false)
  }

  return (
    <div
      className={[
        styles.fader,
        groupColor ? styles.grouped : '',
      ].filter(Boolean).join(' ')}
      style={groupColor ? { '--group-color': groupColor } as React.CSSProperties : undefined}
    >
      <div className={styles.valueRow}>
        {editingValue ? (
          <input
            ref={valueInputRef}
            className={styles.valueInput}
            value={valueDraft}
            onChange={(e) => setValueDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commitValueEdit}
            onKeyDown={handleValueKeyDown}
            data-testid="value-input"
          />
        ) : (
          <span
            className={[
              styles.value,
              styles.editable,
              displayedValue > 0 ? styles.active : '',
              isGroupScaling ? styles.scaled : '',
              groupLocked ? styles.groupLockAlert : '',
            ].filter(Boolean).join(' ')}
            onClick={startValueEdit}
            onAnimationEnd={() => setGroupLocked(false)}
            data-testid="value-display"
          >
            {displayedValue}
          </span>
        )}
        {groupColor && (
          <span
            className={styles.groupDot}
            style={{ background: groupColor }}
            data-testid="group-dot"
            title="Group active"
          />
        )}
      </div>
      {groupLocked && (
        <span className={styles.groupLockMsg} aria-live="polite">Group fader active</span>
      )}
      <Slider value={value} onChange={onChange} fillColor={fillColor} groupMultiplier={groupMultiplier} />
      <button
        className={`${styles.toggleBtn}${value > 0 ? ` ${styles.on}` : ''}`}
        aria-label="toggle"
        aria-pressed={value > 0}
        onClick={() => onChange(value > 0 ? 0 : 255)}
      >
        <span
          className={styles.toggleDot}
          style={{ background: `rgba(255,255,255,${value / 255})` }}
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
            {channel !== undefined && (
              <span className={styles.channel}>
                {universe !== undefined
                  ? `${universe + 1}-${String(channel).padStart(3, '0')}`
                  : String(channel).padStart(3, '0')}
              </span>
            )}
            {label && (
              <span className={styles.label} data-testid="raw-fader-label">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
