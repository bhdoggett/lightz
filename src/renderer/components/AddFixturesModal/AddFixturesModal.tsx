import { useState, useCallback } from 'react'
import { Modal } from './Modal'
import type { Fixture } from '../../shared/types'
import styles from './AddFixturesModal.module.css'

interface Props {
  existingFixtures: Fixture[]
  onApply: (toAdd: Fixture[], toRemoveIds: string[], toUpdate: Fixture[]) => void
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

function initForUniverse(fixtures: Fixture[], universe: 0 | 1) {
  const onUniverse = fixtures.filter((f) => f.universe === universe)
  const selected = new Set(onUniverse.map((f) => f.channel))
  const names: Record<number, string> = {}
  for (const f of onUniverse) names[f.channel] = f.name
  return { selected, names }
}

export function AddFixturesModal({ existingFixtures, onApply, onClose }: Props) {
  const [universe, setUniverse] = useState<0 | 1>(0)
  const [rangeInput, setRangeInput] = useState('')

  const init = initForUniverse(existingFixtures, 0)
  const [selected, setSelected] = useState<Set<number>>(init.selected)
  const [names, setNames] = useState<Record<number, string>>(init.names)

  const existingOnUniverse = existingFixtures.filter((f) => f.universe === universe)
  const existingChannels = new Set(existingOnUniverse.map((f) => f.channel))

  const switchUniverse = (u: 0 | 1) => {
    setUniverse(u)
    const next = initForUniverse(existingFixtures, u)
    setSelected(next.selected)
    setNames(next.names)
    setRangeInput('')
  }

  const toggleChannel = useCallback((ch: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(ch)) { next.delete(ch) } else { next.add(ch) }
      return next
    })
  }, [])

  const applyRange = () => {
    const channels = parseRange(rangeInput)
    setSelected(new Set(channels))
  }

  const sortedSelected = [...selected].sort((a, b) => a - b)

  const handleApply = () => {
    const toAdd: Fixture[] = []
    const toRemoveIds: string[] = []
    const toUpdate: Fixture[] = []

    for (const ch of selected) {
      if (!existingChannels.has(ch)) {
        toAdd.push({
          id: crypto.randomUUID(),
          name: names[ch]?.trim() || `Ch ${String(ch).padStart(3, '0')}`,
          channel: ch,
          universe,
          type: 'dimmer',
        })
      }
    }

    for (const f of existingOnUniverse) {
      if (!selected.has(f.channel)) {
        toRemoveIds.push(f.id)
      } else {
        const newName = names[f.channel]?.trim() || f.name
        if (newName !== f.name) toUpdate.push({ ...f, name: newName })
      }
    }

    onApply(toAdd, toRemoveIds, toUpdate)
  }

  const pendingAdds = sortedSelected.filter((ch) => !existingChannels.has(ch)).length
  const pendingRemoves = existingOnUniverse.filter((f) => !selected.has(f.channel)).length

  const summaryLabel = () => {
    const parts: string[] = []
    if (pendingAdds > 0) parts.push(`Add ${pendingAdds}`)
    if (pendingRemoves > 0) parts.push(`Remove ${pendingRemoves}`)
    return parts.length > 0 ? parts.join(', ') : 'Apply'
  }

  return (
    <Modal
      title="Edit Fixtures"
      onClose={onClose}
      minWidth="520px"
      maxWidth="620px"
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn} onClick={handleApply}>
            {summaryLabel()}
          </button>
        </div>
      }
    >
      <div className={styles.body}>

        <div className={styles.universeRow}>
          <span className={styles.universeLabel}>Universe</span>
          <button className={`${styles.uBtn}${universe === 0 ? ` ${styles.active}` : ''}`} onClick={() => switchUniverse(0)}>U1</button>
          <button className={`${styles.uBtn}${universe === 1 ? ` ${styles.active}` : ''}`} onClick={() => switchUniverse(1)}>U2</button>
        </div>

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

        <div>
          <div className={styles.gridLabel}>Channels — click to toggle</div>
          <div className={styles.grid}>
            {Array.from({ length: 512 }, (_, i) => i + 1).map((ch) => (
              <div
                key={ch}
                className={[
                  styles.cell,
                  selected.has(ch) ? styles.selected : '',
                  existingChannels.has(ch) && !selected.has(ch) ? styles.removing : '',
                ].filter(Boolean).join(' ')}
                onClick={() => toggleChannel(ch)}
                title={
                  existingChannels.has(ch)
                    ? selected.has(ch) ? 'Click to remove' : 'Will be removed — click to keep'
                    : `Channel ${ch}`
                }
              >
                {ch}
              </div>
            ))}
          </div>
        </div>

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
