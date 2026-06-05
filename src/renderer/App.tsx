import { useEffect, useState } from 'react'
import { MainView } from './views/MainView'
import { ConnectionBadge } from './components/ConnectionBadge'
import { CompanionModal } from './components/CompanionModal'
import { ShowsModal } from './components/ShowsModal'
import type { Config, DmxStatus, Fixture, Scene, Group } from '../shared/types'
import styles from './App.module.css'

export function App() {
  const [config, setConfig] = useState<Config | null>(null)
  const [dmxStatus, setDmxStatus] = useState<DmxStatus>('disconnected')
  const [companionOpen, setCompanionOpen] = useState(false)
  const [showsOpen, setShowsOpen] = useState(false)
  const [currentShowName, setCurrentShowName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  const handleGroupsChange = (groups: Group[]) =>
    setConfig((c) => c ? { ...c, groups } : c)

  const handlePortChange = async (port: number) => {
    await window.electronAPI.setPort(port)
    setConfig((c) => c ? { ...c, companionPort: port } : c)
  }

  const handleDevicePathChange = async (path: string) => {
    await window.electronAPI.setDevicePath(path)
    setConfig((c) => c ? { ...c, devicePath: path } : c)
  }

  const handleDmxOutputPortChange = async (port: 0 | 1 | 2) => {
    await window.electronAPI.setDmxOutputPort(port)
    setConfig((c) => c ? { ...c, dmxOutputPort: port } : c)
  }

  const handleSaveCurrent = async () => {
    if (!currentShowName) return
    setSaving(true)
    try {
      await window.electronAPI.saveNamedShow(currentShowName)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.appName}>Church Lights</span>
        <div className={styles.headerRight}>
          {currentShowName && (
            <button
              className={styles.showBtn}
              onClick={handleSaveCurrent}
              disabled={saving}
              title={`Save to "${currentShowName}"`}
            >
              {saving ? 'Saving…' : `Save`}
            </button>
          )}
          <button className={styles.showBtn} onClick={() => setShowsOpen(true)} title="Shows">
            {currentShowName ?? 'Shows'}
          </button>
          <div className={styles.showDivider} />
          <ConnectionBadge status={dmxStatus} />
          <button className={styles.iconBtn} onClick={() => setCompanionOpen(true)} title="Settings">
            ⚙
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <MainView
          fixtures={config.fixtures}
          scenes={config.scenes}
          groups={config.groups}
          onScenesChange={handleScenesChange}
          onFixturesChange={handleFixturesChange}
          onGroupsChange={handleGroupsChange}
        />
      </div>

      {showsOpen && (
        <ShowsModal
          onLoad={(imported, name) => { setConfig(imported); setCurrentShowName(name) }}
          onSaved={(name) => setCurrentShowName(name)}
          onClose={() => setShowsOpen(false)}
        />
      )}

      {companionOpen && (
        <CompanionModal
          scenes={config.scenes}
          port={config.companionPort}
          devicePath={config.devicePath}
          ports={[]}
          dmxOutputPort={config.dmxOutputPort}
          onPortChange={handlePortChange}
          onDevicePathChange={handleDevicePathChange}
          onDmxOutputPortChange={handleDmxOutputPortChange}
          onClose={() => setCompanionOpen(false)}
        />
      )}
    </div>
  )
}
