import { useState, useEffect, useCallback } from 'react'
import { Modal } from './Modal'
import type { Config, ShowInfo } from '../../shared/types'
import styles from './ShowsModal.module.css'

interface Props {
  onLoad: (config: Config) => void
  onClose: () => void
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function ShowsModal({ onLoad, onClose }: Props) {
  const [shows, setShows] = useState<ShowInfo[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    const list = await window.electronAPI.listShows()
    setShows(list)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleLoad = async (name: string) => {
    const config = await window.electronAPI.loadNamedShow(name)
    onLoad(config)
    onClose()
  }

  const handleDelete = async (name: string) => {
    const updated = await window.electronAPI.deleteNamedShow(name)
    setShows(updated)
  }

  const handleSave = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    const updated = await window.electronAPI.saveNamedShow(name)
    setShows(updated)
    setNewName('')
    setSaving(false)
  }

  return (
    <Modal title="Shows" onClose={onClose} minWidth="420px" maxWidth="520px">
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
