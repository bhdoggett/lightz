import { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from './Modal'
import type { Config, ShowInfo } from '../../shared/types'
import styles from './ShowsModal.module.css'

interface Props {
  onLoad: (config: Config, name: string) => void
  onSaved?: (name: string) => void
  onNew: (config: Config) => void
  onClose: () => void
  dirty?: boolean
  currentShowName?: string | null
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function parseShowFile(file: File): Promise<{ config: Config; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string)
        if (!Array.isArray(raw.fixtures) || !Array.isArray(raw.scenes)) {
          reject(new Error('Not a valid show file'))
          return
        }
        const config: Config = { groups: [], ...raw }
        const name = file.name.replace(/\.json$/i, '')
        resolve({ config, name })
      } catch {
        reject(new Error('Could not parse file'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsText(file)
  })
}

type PendingAction =
  | { type: 'load'; name: string }
  | { type: 'new' }
  | { type: 'drop'; config: Config; name: string }

export function ShowsModal({ onLoad, onSaved, onNew, onClose, dirty = false, currentShowName }: Props) {
  const [shows, setShows] = useState<ShowInfo[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [loadingName, setLoadingName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const dragCounter = useRef(0)

  const refresh = useCallback(async () => {
    try {
      const list = await window.electronAPI.listShows()
      setShows(list)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const executeNew = async () => {
    setResetting(true)
    try {
      const config = await window.electronAPI.resetShow()
      onNew(config)
      onClose()
    } catch (e) {
      setError(`Could not reset: ${String(e)}`)
    } finally {
      setResetting(false)
    }
  }

  const executeLoad = async (name: string) => {
    if (loadingName) return
    setError(null)
    setLoadingName(name)
    try {
      const config = await window.electronAPI.loadNamedShow(name)
      onLoad(config, name)
      onClose()
    } catch (e) {
      setError(`Could not load "${name}": ${String(e)}`)
      setLoadingName(null)
    }
  }

  const handleNew = () => {
    if (dirty) { setPendingAction({ type: 'new' }); return }
    executeNew()
  }

  const handleLoad = (name: string) => {
    if (dirty) { setPendingAction({ type: 'load', name }); return }
    executeLoad(name)
  }

  const confirmPending = () => {
    if (!pendingAction) return
    setPendingAction(null)
    if (pendingAction.type === 'new') executeNew()
    else if (pendingAction.type === 'load') executeLoad(pendingAction.name)
    else { onLoad(pendingAction.config, pendingAction.name); onClose() }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) setDragging(true)
  }

  const handleDragLeave = () => {
    dragCounter.current--
    if (dragCounter.current === 0) setDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.name.endsWith('.json')) {
      setError('Drop a .json show file')
      return
    }
    setError(null)
    try {
      const { config, name } = await parseShowFile(file)
      if (dirty) { setPendingAction({ type: 'drop', config, name }); return }
      onLoad(config, name)
      onClose()
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <Modal title="Shows" onClose={onClose} minWidth="420px" maxWidth="520px">
      {pendingAction && (
        <div className={styles.unsavedWarning}>
          <span className={styles.warningIcon}>⚠</span>
          <p className={styles.warningText}>
            {currentShowName
              ? <>Unsaved changes to <strong>{currentShowName}</strong> will be lost.</>
              : <>You have unsaved changes that will be lost.</>}
          </p>
          <div className={styles.warningActions}>
            <button className={styles.warningConfirmBtn} onClick={confirmPending}>
              {pendingAction.type === 'new' ? 'Discard & New' : 'Discard & Load'}
            </button>
            <button className={styles.warningCancelBtn} onClick={() => setPendingAction(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p style={{ color: 'var(--status-error)', fontSize: 12, marginBottom: 'var(--space-3)' }}>
          {error}
        </p>
      )}
      <button
        className={styles.newBtn}
        onClick={handleNew}
        disabled={resetting}
      >
        {resetting ? 'Clearing…' : '+ New Show'}
      </button>
      <div
        className={`${styles.showList}${dragging ? ` ${styles.dropTarget}` : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {dragging ? (
          <p className={styles.dropHint}>Drop to load show</p>
        ) : (
          <>
            {shows.length === 0 && (
              <p className={styles.empty}>No saved shows yet.</p>
            )}
            {shows.map((show) => (
              <div key={show.name} className={styles.showRow}>
                <span className={styles.showName}>{show.name}</span>
                <span className={styles.showDate}>{formatDate(show.modifiedAt)}</span>
                <button
                  className={styles.loadBtn}
                  onClick={() => handleLoad(show.name)}
                  disabled={loadingName !== null}
                >
                  {loadingName === show.name ? (
                    <span className={styles.spinner} aria-label="Loading" />
                  ) : (
                    'Load'
                  )}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(show.name)}
                  disabled={loadingName !== null}
                  title="Delete show"
                >
                  ×
                </button>
              </div>
            ))}
          </>
        )}
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
