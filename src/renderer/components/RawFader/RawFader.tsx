import { useState, useRef, useEffect } from 'react'
import { Slider } from '../Slider'
import styles from './RawFader.module.css'
import type { DragHandleProps } from '../../hooks/useDragReorder'

interface Props {
  channel?: number
  universe?: 0 | 1
  value: number
  label?: string
  onChange: (value: number) => void
  onRename?: (name: string) => void
  fillColor?: string
  groupMultiplier?: number
  isEditing?: boolean
  selected?: boolean
  onSelect?: (e: React.MouseEvent) => void
  dragHandleProps?: DragHandleProps
}

export function RawFader({
  channel, universe, value, label, onChange, onRename, fillColor, groupMultiplier,
  isEditing = false, selected = false, onSelect, dragHandleProps,
}: Props) {
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
      data-testid="fader-root"
      className={[
        styles.fader,
        selected ? styles.selected : '',
      ].filter(Boolean).join(' ')}
      onClick={isEditing ? onSelect : undefined}
    >
      <div className={styles.valueRow}>
        {isEditing ? (
          <span
            className={`${styles.value} ${styles.dragHandle}`}
            data-testid="drag-handle"
            onClick={(e) => e.stopPropagation()}
            {...dragHandleProps}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
              <circle cx="2.5" cy="2.5" r="1.2" />
              <circle cx="7.5" cy="2.5" r="1.2" />
              <circle cx="2.5" cy="7.5" r="1.2" />
              <circle cx="7.5" cy="7.5" r="1.2" />
            </svg>
          </span>
        ) : editingValue ? (
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
      </div>
      {groupLocked && (
        <span className={styles.groupLockMsg} aria-live="polite">Group fader active</span>
      )}
      <div className={styles.sliderGuard}>
        <Slider value={value} onChange={onChange} fillColor={fillColor} groupMultiplier={groupMultiplier} />
        {isEditing && <div className={styles.selectOverlay} data-testid="select-overlay" />}
      </div>
      <button
        className={`${styles.toggleBtn}${value > 0 ? ` ${styles.on}` : ''}`}
        aria-label="toggle"
        aria-pressed={value > 0}
        onClick={isEditing ? undefined : () => onChange(value > 0 ? 0 : 255)}
      >
        <span
          className={styles.toggleDot}
          style={{ background: `rgba(255,255,255,${value / 255})` }}
        />
      </button>
      <div
        className={`${styles.nameArea}${onRename ? ` ${styles.renameable}` : ''}`}
        onClick={isEditing ? undefined : startEdit}
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
