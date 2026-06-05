import { useState, useEffect, useCallback } from 'react'
import { Modal } from './Modal'
import type { Config, ShowInfo } from '../../shared/types'
import styles from './ShowsModal.module.css'

interface Props {
  onLoad: (config: Config, name: string) => void
  onSaved?: (name: string) => void  // called after a successful save-as
  onClose: () => void
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function ShowsModal({ onLoad, onSaved, onClose }: Props) {
  const [shows, setShows] = useState<ShowInfo[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await window.electronAPI.listShows()
      setShows(list)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleLoad = async (name: string) => {
    try {
      const config = await window.electronAPI.loadNamedShow(name)
      onLoad(config, name)
      onClose()
    } catch (e) {
      setError(`Could not load "${name}": ${String(e)}`)
    }
  }

  const handleDelete = async (name: string) => {
    try {
      const updated = await window.electronAPI.deleteNamedShow(name)
      setShows(updated)
    } catch (e) {
      setError(`Could not delete "${name}": ${String(e)}`)
    }
  }

  const handleSave = async () => {
    const name = newName.trim()
    if (!name) return
    setError(null)
    setSaving(true)
    try {
      const updated = await window.electronAPI.saveNamedShow(name)
      setShows(updated)
      onSaved?.(name)
      setNewName('')
    } catch (e) {
      setError(`Could not save show: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Shows" onClose={onClose} minWidth="420px" maxWidth="520px">
      {error && (
        <p style={{ color: 'var(--status-error)', fontSize: 12, marginBottom: 'var(--space-3)' }}>
          {error}
        </p>
      )}
      <div className={styles.showList}>
        {shows.length === 0 && (
          <p className={styles.empty}>No saved shows yet.</p>
        )}
        {shows.map((show) => (
          <div key={show.name} className={styles.showRow}>
            <span className={styles.showName}>{show.name}</span>
            <span className={styles.showDate}>{formatDate(show.modifiedAt)}</span>
            <button className={styles.loadBtn} onClick={() => handleLoad(show.name)}>
              Load
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => handleDelete(show.name)}
              title="Delete show"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className={styles.divider} />
      <div className={styles.saveRow}>
        <input
          className={styles.nameInput}
          placeholder="Save current state as…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={!newName.trim() || saving}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}
