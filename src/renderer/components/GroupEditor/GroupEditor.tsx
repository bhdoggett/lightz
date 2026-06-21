import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { GROUP_COLORS } from '../../shared/types'
import type { Group, Fixture } from '../../shared/types'
import styles from './GroupEditor.module.css'

interface Props {
  groups: Group[]
  fixtures: Fixture[]
  editing: Group | null
  onSave: (group: Group) => void
  onDelete: (id: string) => void
  onCancel: () => void
}

export function GroupEditor({ groups, fixtures, editing, onSave, onDelete, onCancel }: Props) {
  const [name, setName] = useState(editing?.name ?? '')
  const [color, setColor] = useState(editing?.color ?? GROUP_COLORS[0])
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<string[]>(editing?.fixtureIds ?? [])

  useEffect(() => {
    setName(editing?.name ?? '')
    setColor(editing?.color ?? GROUP_COLORS[0])
    setSelectedFixtureIds(editing?.fixtureIds ?? [])
  }, [editing])

  const takenByOther = (fixtureId: string): Group | undefined =>
    groups.find((g) => g.id !== editing?.id && g.fixtureIds.includes(fixtureId))

  const toggleFixture = (fixtureId: string) => {
    setSelectedFixtureIds((prev) =>
      prev.includes(fixtureId) ? prev.filter((id) => id !== fixtureId) : [...prev, fixtureId]
    )
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      id: editing?.id ?? uuid(),
      name: name.trim(),
      color,
      fixtureIds: selectedFixtureIds,
    })
  }

  return (
    <div className={styles.editor}>
      <div className={styles.row}>
        <input
          className={styles.nameInput}
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <div className={styles.label}>Color</div>
        <div className={styles.colorPalette}>
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              className={`${styles.colorSwatch}${c === color ? ` ${styles.selected}` : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
      </div>

      <div>
        <div className={styles.label}>Fixtures</div>
        <div className={styles.fixtureList}>
          {fixtures.map((f) => {
            const owner = takenByOther(f.id)
            const disabled = !!owner
            return (
              <label
                key={f.id}
                className={`${styles.fixtureItem}${disabled ? ` ${styles.taken}` : ''}`}
              >
                <input
                  type="checkbox"
                  aria-label={f.name}
                  checked={selectedFixtureIds.includes(f.id)}
                  disabled={disabled}
                  onChange={() => !disabled && toggleFixture(f.id)}
                />
                {f.name}
                {owner && <span className={styles.takenLabel}>({owner.name})</span>}
              </label>
            )
          })}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={handleSave}>Save</button>
        {editing && (
          <button className={styles.deleteBtn} onClick={() => onDelete(editing.id)}>Delete</button>
        )}
        <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
