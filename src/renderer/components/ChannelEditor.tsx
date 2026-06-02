import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import type { Fixture, FixtureType } from '../../shared/types'
import styles from './ChannelEditor.module.css'

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
    return <div className={styles.placeholder}>Select a channel from the list to edit it.</div>
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ id: fixture?.id ?? uuid(), name: name.trim(), channel, universe, type })
  }

  return (
    <div className={styles.editor}>
      <h3 className={styles.title}>Channel {channel}</h3>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Fixture name</label>
        <input
          className={styles.input}
          placeholder="Fixture name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Type</span>
        <div className={styles.segmentGroup}>
          <button
            className={`${styles.segmentBtn}${type === 'dimmer' ? ` ${styles.active}` : ''}`}
            onClick={() => setType('dimmer')}
          >Dimmer</button>
          <button
            className={`${styles.segmentBtn}${type === 'switch' ? ` ${styles.active}` : ''}`}
            onClick={() => setType('switch')}
          >Switch</button>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Universe</span>
        <div className={styles.segmentGroup}>
          <button
            className={`${styles.segmentBtn}${universe === 0 ? ` ${styles.active}` : ''}`}
            onClick={() => setUniverse(0)}
          >1</button>
          <button
            className={`${styles.segmentBtn}${universe === 1 ? ` ${styles.active}` : ''}`}
            onClick={() => setUniverse(1)}
          >2</button>
        </div>
      </div>

      <button className={styles.saveBtn} onClick={handleSave}>Save</button>

      {fixture && (
        <button className={styles.deleteBtn} onClick={() => onDelete(fixture.id)}>
          Remove fixture
        </button>
      )}
    </div>
  )
}
