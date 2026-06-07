import { useState, useCallback } from 'react'
import { Modal } from './Modal'
import type { Fixture } from '../../shared/types'
import styles from './AddFixturesModal.module.css'

interface Props {
  existingFixtures: Fixture[]
  onAdd: (fixtures: Fixture[]) => void
  onClose: () => void
}

function parseRange(input: string): number[] {
  const result: number[] = []
  for (const part of input.split(',')) {
    const t = part.trim()
    const range = t.match(/^(\d+)-(\d+)$/)
    if (range) {
      const a = Math.min(parseInt(range[1]), 512)
      const b = Math.min(parseInt(range[2]), 512)
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) result.push(i)
    } else {
      const n = parseInt(t)
      if (!isNaN(n) && n >= 1 && n <= 512) result.push(n)
    }
  }
  return [...new Set(result)].sort((a, b) => a - b)
}

export function AddFixturesModal({ existingFixtures, onAdd, onClose }: Props) {
  const [universe, setUniverse] = useState<0 | 1>(0)
  const [rangeInput, setRangeInput] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [names, setNames] = useState<Record<number, string>>({})

  const takenChannels = new Set(
    existingFixtures.filter((f) => f.universe === universe).map((f) => f.channel)
  )

  const toggleChannel = useCallback((ch: number) => {
    if (takenChannels.has(ch)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(ch)) { next.delete(ch) } else { next.add(ch) }
      return next
    })
  }, [takenChannels])

  const applyRange = () => {
    const channels = parseRange(rangeInput).filter((ch) => !takenChannels.has(ch))
    setSelected(new Set(channels))
  }

  const sortedSelected = [...selected].sort((a, b) => a - b)

  const handleAdd = () => {
    const fixtures: Fixture[] = sortedSelected.map((ch) => ({
      id: crypto.randomUUID(),
      name: names[ch]?.trim() || `Ch ${String(ch).padStart(3, '0')}`,
      channel: ch,
      universe,
      type: 'dimmer' as const,
    }))
    onAdd(fixtures)
  }

  return (
    <Modal
      title="Add Fixtures"
      onClose={onClose}
      minWidth="520px"
      maxWidth="620px"
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.addBtn}
            disabled={sortedSelected.length === 0}
            onClick={handleAdd}
          >
            Add {sortedSelected.length > 0 ? `${sortedSelected.length} ` : ''}Fixture{sortedSelected.length !== 1 ? 's' : ''}
          </button>
        </div>
      }
    >
      <div className={styles.body}>

        {/* Universe */}
        <div className={styles.universeRow}>
          <span className={styles.universeLabel}>Universe</span>
          <button className={`${styles.uBtn}${universe === 0 ? ` ${styles.active}` : ''}`} onClick={() => { setUniverse(0); setSelected(new Set()); setNames({}) }}>U1</button>
          <button className={`${styles.uBtn}${universe === 1 ? ` ${styles.active}` : ''}`} onClick={() => { setUniverse(1); setSelected(new Set()); setNames({}) }}>U2</button>
        </div>

        {/* Range input */}
        <div className={styles.rangeRow}>
          <input
            className={styles.rangeInput}
            placeholder="e.g. 1-8 or 1,3,5 or 1-4,7,9-12"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyRange()}
          />
          <button className={styles.uBtn} onClick={applyRange}>Select</button>
          <span className={styles.rangeHint}>or click below</span>
        </div>

        {/* Channel grid */}
        <div>
          <div className={styles.gridLabel}>Channels — click to toggle</div>
          <div className={styles.grid}>
            {Array.from({ length: 512 }, (_, i) => i + 1).map((ch) => (
              <div
                key={ch}
                className={[
                  styles.cell,
                  selected.has(ch) ? styles.selected : '',
                  takenChannels.has(ch) ? styles.taken : '',
                ].filter(Boolean).join(' ')}
                onClick={() => toggleChannel(ch)}
                title={takenChannels.has(ch) ? 'Already assigned' : `Channel ${ch}`}
              >
                {ch}
              </div>
            ))}
          </div>
        </div>

        {/* Name fields */}
        {sortedSelected.length > 0 && (
          <div>
            <div className={styles.gridLabel}>
              Name {sortedSelected.length} fixture{sortedSelected.length !== 1 ? 's' : ''}
            </div>
            <div className={styles.nameList}>
              {sortedSelected.map((ch) => (
                <div key={ch} className={styles.nameRow}>
                  <span className={styles.channelBadge}>{String(ch).padStart(3, '0')}</span>
                  <input
                    className={styles.nameInput}
                    placeholder={`Ch ${String(ch).padStart(3, '0')}`}
                    value={names[ch] ?? ''}
                    onChange={(e) => setNames((prev) => ({ ...prev, [ch]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Modal>
  )
}
