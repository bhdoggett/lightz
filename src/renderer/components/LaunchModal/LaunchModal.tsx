import { useState, useEffect } from 'react'
import { AppName } from '../AppName'
import { useApi } from '../../api/context'
import type { Config, ShowInfo } from '../../../shared/types'
import styles from './LaunchModal.module.css'

interface Props {
  onNew: (config: Config) => void
  onLoad: (config: Config, name: string) => void
}

export function LaunchModal({ onNew, onLoad }: Props) {
  const api = useApi()
  const [shows, setShows] = useState<ShowInfo[]>([])
  const [loadingName, setLoadingName] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listShows().then(setShows).catch((e) => setError(String(e)))
  }, [])

  const handleNew = async () => {
    setResetting(true)
    try {
      const config = await api.resetShow()
      onNew(config)
    } catch (e) {
      setError(String(e))
    } finally {
      setResetting(false)
    }
  }

  const handleLoad = async (name: string) => {
    if (loadingName) return
    setLoadingName(name)
    try {
      const config = await api.loadNamedShow(name)
      onLoad(config, name)
    } catch (e) {
      setError(`Could not load "${name}": ${String(e)}`)
      setLoadingName(null)
    }
  }

  const handleImportFile = async () => {
    setError(null)
    try {
      const result = await api.importShow()
      if (!result) return
      onLoad(result.config, result.name)
    } catch {
      setError('Invalid show file format')
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.title}><AppName /></div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.topActions}>
          <button className={styles.newBtn} onClick={handleNew} disabled={resetting || loadingName !== null}>
            {resetting ? 'Creating…' : '+ New Show'}
          </button>
          <button className={styles.importBtn} onClick={handleImportFile} disabled={resetting || loadingName !== null}>
            Load from file…
          </button>
        </div>
        <div className={styles.showList}>
          {shows.length === 0 ? (
            <p className={styles.empty}>No saved shows yet.</p>
          ) : (
            shows.map((show) => (
              <button
                key={show.name}
                className={styles.showBtn}
                onClick={() => handleLoad(show.name)}
                disabled={loadingName !== null}
              >
                {loadingName === show.name ? (
                  <span className={styles.spinner} aria-label="Loading" />
                ) : (
                  show.name
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
