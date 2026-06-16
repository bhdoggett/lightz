import { useEffect, useRef, useState } from 'react'
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
  const [dirty, setDirty] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const justSavedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (justSavedTimeout.current) clearTimeout(justSavedTimeout.current)
    }
  }, [])

  useEffect(() => {
    window.electronAPI.getConfig().then(setConfig)
    window.electronAPI.onDmxStatus(setDmxStatus)
    window.electronAPI.onDeviceAutoConnected((path) => {
      setConfig((c) => c ? { ...c, devicePath: path } : c)
      setDirty(true)
    })
  }, [])

  if (!config) {
    return <div className={styles.loading}>Loading...</div>
  }

  const handleFixturesChange = (fixtures: Fixture[]) => {
    setConfig((c) => c ? { ...c, fixtures } : c)
    setDirty(true)
  }

  const handleScenesChange = (scenes: Scene[]) => {
    setConfig((c) => c ? { ...c, scenes } : c)
    setDirty(true)
  }

  const handleGroupsChange = (groups: Group[]) => {
    setConfig((c) => c ? { ...c, groups } : c)
    setDirty(true)
  }

  const handlePortChange = async (port: number) => {
    await window.electronAPI.setPort(port)
    setConfig((c) => c ? { ...c, companionPort: port } : c)
    setDirty(true)
  }

  const handleDevicePathChange = async (path: string) => {
    await window.electronAPI.setDevicePath(path)
    setConfig((c) => c ? { ...c, devicePath: path } : c)
    setDirty(true)
  }

  const handleDmxOutputPortChange = async (port: 0 | 1 | 2) => {
    await window.electronAPI.setDmxOutputPort(port)
    setConfig((c) => c ? { ...c, dmxOutputPort: port } : c)
    setDirty(true)
  }

  const handleSaveCurrent = async () => {
    if (!currentShowName) return
    setSaving(true)
    try {
      await window.electronAPI.saveNamedShow(currentShowName)
      setDirty(false)
      setJustSaved(true)
      if (justSavedTimeout.current) clearTimeout(justSavedTimeout.current)
      justSavedTimeout.current = setTimeout(() => setJustSaved(false), 1500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.appName}>Lightz</span>
        <div className={styles.headerRight}>
          {currentShowName && (
            <button
              className={[
                styles.saveIconBtn,
                justSaved ? styles.saved : dirty ? styles.dirty : '',
              ].filter(Boolean).join(' ')}
              onClick={handleSaveCurrent}
              disabled={saving}
              title={
                justSaved
                  ? 'Saved'
                  : dirty
                    ? `Unsaved changes — save to "${currentShowName}"`
                    : `Save to "${currentShowName}"`
              }
            >
              {justSaved ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="3.5" y="1" width="5" height="4.5" rx="0.5" fill="currentColor"/>
                  <rect x="3" y="7" width="8" height="5" rx="0.5" fill="currentColor"/>
                </svg>
              )}
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
          currentShowName={currentShowName}
        />
      </div>

      {showsOpen && (
        <ShowsModal
          onLoad={(imported, name) => { setConfig(imported); setCurrentShowName(name); setDirty(false) }}
          onSaved={(name) => { setCurrentShowName(name); setDirty(false) }}
          onNew={(fresh) => { setConfig(fresh); setCurrentShowName(null); setDirty(false) }}
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
