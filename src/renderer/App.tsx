import { useEffect, useState } from 'react'
import { MainView } from './views/MainView'
import { SetupView } from './views/SetupView'
import { ConnectionBadge } from './components/ConnectionBadge'
import { CompanionModal } from './components/CompanionModal'
import type { Config, DmxStatus, Fixture, Scene } from '../shared/types'
import styles from './App.module.css'

type View = 'main' | 'setup'

export function App() {
  const [config, setConfig] = useState<Config | null>(null)
  const [view, setView] = useState<View>('main')
  const [dmxStatus, setDmxStatus] = useState<DmxStatus>('disconnected')
  const [companionOpen, setCompanionOpen] = useState(false)

  useEffect(() => {
    window.electronAPI.getConfig().then(setConfig)
    window.electronAPI.onDmxStatus(setDmxStatus)
  }, [])

  if (!config) {
    return <div className={styles.loading}>Loading...</div>
  }

  const handleFixturesChange = (fixtures: Fixture[]) =>
    setConfig((c) => c ? { ...c, fixtures } : c)

  const handleScenesChange = (scenes: Scene[]) =>
    setConfig((c) => c ? { ...c, scenes } : c)

  const handlePortChange = async (port: number) => {
    await window.electronAPI.setPort(port)
    setConfig((c) => c ? { ...c, companionPort: port } : c)
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.appName}>Church Lights</span>
        <div className={styles.headerRight}>
          <ConnectionBadge status={dmxStatus} />
          {view === 'main' && (
            <button className={styles.iconBtn} onClick={() => setView('setup')} title="Setup">
              ⚙
            </button>
          )}
          <button className={styles.iconBtn} onClick={() => setCompanionOpen(true)} title="Companion">
            ℹ
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {view === 'main' ? (
          <MainView
            fixtures={config.fixtures}
            scenes={config.scenes}
            onScenesChange={handleScenesChange}
          />
        ) : (
          <SetupView
            fixtures={config.fixtures}
            onFixturesChange={handleFixturesChange}
            onBack={() => setView('main')}
          />
        )}
      </div>

      {companionOpen && (
        <CompanionModal
          scenes={config.scenes}
          port={config.companionPort}
          onPortChange={handlePortChange}
          onClose={() => setCompanionOpen(false)}
        />
      )}
    </div>
  )
}
