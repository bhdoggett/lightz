import { useCallback, useEffect, useRef, useState } from 'react'
import { MainView } from './views/MainView'
import { ConnectionBadge } from './components/ConnectionBadge'
import { CompanionModal } from './components/CompanionModal'
import { ShowsModal } from './components/ShowsModal'
import { LightVisualizer } from './components/LightVisualizer'
import { PopoutWindow } from './components/PopoutWindow'
import { useApi } from './api/context'
import { useDmxState } from './hooks/useDmxState'
import type { Config, DmxStatus, Fixture, Scene, Group, GroupChannelOverride } from '../shared/types'
import styles from './App.module.css'
import { version as APP_VERSION } from '../../package.json'

type DmxState = ReturnType<typeof useDmxState>

interface AppProps {
  dmxState?: DmxState
  isDemo?: boolean
}

export function App({ dmxState: externalDmxState, isDemo = false }: AppProps) {
  const api = useApi()
  const internalDmxState = useDmxState()
  const { getChannel, setChannel: setLocal, applyScene } = externalDmxState ?? internalDmxState
  const [config, setConfig] = useState<Config | null>(null)
  const [dmxStatus, setDmxStatus] = useState<DmxStatus>('disconnected')
  const [companionOpen, setCompanionOpen] = useState(false)
  const [showsOpen, setShowsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const aboutRef = useRef<HTMLDivElement>(null)
  const [currentShowName, setCurrentShowName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const justSavedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTriggerRef = useRef<(() => void) | null>(null)
  const [overrideMap, setOverrideMap] = useState<Record<string, GroupChannelOverride>>({})
  const [vizPopped, setVizPopped] = useState(false)

  useEffect(() => {
    return () => {
      if (justSavedTimeout.current) clearTimeout(justSavedTimeout.current)
    }
  }, [])

  useEffect(() => {
    api.getConfig().then(setConfig)
    api.onDmxStatus(setDmxStatus)
    api.onDeviceAutoConnected((path) => {
      setConfig((c) => c ? { ...c, devicePath: path } : c)
      setDirty(true)
    })

    api.onMenuNewShow(async () => {
      const config = await api.resetShow()
      setConfig(config)
      setCurrentShowName(null)
      setDirty(false)
    })

    api.onMenuSaveShow(() => {
      saveTriggerRef.current?.()
    })

    api.onMenuOpenShows(() => setShowsOpen(true))
    api.onMenuOpenSettings(() => setCompanionOpen(true))

    api.onMenuExportShow(() => {
      api.exportShow()
    })

    api.onMenuImportShow(async () => {
      const imported = await api.importShow()
      if (imported) {
        setConfig(imported)
        setCurrentShowName(null)
        setDirty(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!aboutOpen) return
    const handleOutside = (e: MouseEvent) => {
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node)) setAboutOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [aboutOpen])

  const handleFixtureVizChange = useCallback(async (fixtureId: string, vizPositions: import('../shared/types').VizPosition[]) => {
    setConfig((c) => {
      if (!c) return c
      const fixtures = c.fixtures.map((f) =>
        f.id === fixtureId ? { ...f, vizPositions } : f
      )
      return { ...c, fixtures }
    })
    if (config) {
      const fixture = config.fixtures.find((f) => f.id === fixtureId)
      if (fixture) {
        await api.updateFixture({ ...fixture, vizPositions })
      }
    }
  }, [config, api])

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
    await api.setPort(port)
    setConfig((c) => c ? { ...c, companionPort: port } : c)
    setDirty(true)
  }

  const handleDevicePathChange = async (path: string) => {
    await api.setDevicePath(path)
    setConfig((c) => c ? { ...c, devicePath: path } : c)
    setDirty(true)
  }

  const handleDmxOutputPortChange = async (port: 0 | 1 | 2) => {
    await api.setDmxOutputPort(port)
    setConfig((c) => c ? { ...c, dmxOutputPort: port } : c)
    setDirty(true)
  }

  const handleSaveCurrent = async () => {
    if (!currentShowName) return
    setSaving(true)
    try {
      await api.saveNamedShow(currentShowName)
      setDirty(false)
      setJustSaved(true)
      if (justSavedTimeout.current) clearTimeout(justSavedTimeout.current)
      justSavedTimeout.current = setTimeout(() => setJustSaved(false), 1500)
    } finally {
      setSaving(false)
    }
  }
  saveTriggerRef.current = currentShowName ? handleSaveCurrent : () => setShowsOpen(true)

  return (
    <div className={styles.app}>
      {isDemo && (
        <div className={styles.demoBanner}>
          <span>This is a demo — no DMX hardware connected.</span>
          <a href="https://github.com/bhdoggett/lightz/releases" target="_blank" rel="noopener noreferrer">
            Download the desktop app for real DMX control →
          </a>
        </div>
      )}
      <header className={styles.header}>
        <span className={styles.appName}>Light<span className={styles.appNameZ}>z</span></span>
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
              <span className={styles.saveIconStack}>
                <span
                  className={[styles.saveIconGlyph, styles.saveSpinner, saving ? '' : styles.glyphHidden].filter(Boolean).join(' ')}
                  aria-label="Saving"
                />
                <svg
                  className={[styles.saveIconGlyph, justSaved && !saving ? '' : styles.glyphHidden].filter(Boolean).join(' ')}
                  width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <svg
                  className={[styles.saveIconGlyph, justSaved || saving ? styles.glyphHidden : ''].filter(Boolean).join(' ')}
                  width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="3.5" y="1" width="5" height="4.5" rx="0.5" fill="currentColor"/>
                  <rect x="3" y="7" width="8" height="5" rx="0.5" fill="currentColor"/>
                </svg>
              </span>
            </button>
          )}
          <button className={styles.showBtn} onClick={() => setShowsOpen(true)} title="Shows">
            {currentShowName ?? 'Shows'}
          </button>
          <div className={styles.showDivider} />
          <ConnectionBadge status={dmxStatus} />
          <button className={styles.iconBtn} onClick={() => setCompanionOpen(true)} title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
              <path d="M19.622 10.395l-1.097-2.65L20 6l-2-2-1.735 1.483-2.707-1.113L12.935 2h-1.954l-.632 2.401-2.645 1.115L6 4 4 6l1.453 1.789-1.08 2.657L2 11v2l2.401.655L5.516 16.3 4 18l2 2 1.791-1.46 2.606 1.072L11 22h2l.604-2.387 2.651-1.098C16.697 19.187 18 20 18 20l2-2-1.484-1.752 1.098-2.652 2.386-.62V11l-2.378-.605Z"/>
            </svg>
          </button>
          <div ref={aboutRef} className={styles.aboutWrap}>
            <button className={styles.iconBtn} onClick={() => setAboutOpen((v) => !v)} title="About">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
            {aboutOpen && (() => {
              const rect = aboutRef.current?.getBoundingClientRect()
              const style = rect ? { top: rect.bottom + 8, right: window.innerWidth - rect.right } : {}
              return (
                <div className={styles.aboutPopover} style={style}>
                  <p className={styles.aboutName}>Lightz <span className={styles.aboutVersion}>v{APP_VERSION}</span></p>
                  <button className={styles.aboutLink} onClick={() => api.openExternal('https://github.com/bhdoggett/lightz/releases')}>
                    Releases &amp; changelog
                  </button>
                  <button className={styles.aboutLink} onClick={() => api.openExternal('https://github.com/bhdoggett/lightz')}>
                    GitHub repo
                  </button>
                </div>
              )
            })()}
          </div>
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
          getChannel={getChannel}
          setChannel={setLocal}
          applyScene={applyScene}
          onOverrideMapChange={setOverrideMap}
        />
      </div>
      {vizPopped ? (
        <PopoutWindow title="Lightz — Visualizer" onClose={() => setVizPopped(false)}>
          <LightVisualizer
            fixtures={config.fixtures}
            getChannel={getChannel}
            overrideMap={overrideMap}
            onFixtureVizChange={handleFixtureVizChange}
            popped
            onDock={() => setVizPopped(false)}
          />
        </PopoutWindow>
      ) : (
        <LightVisualizer
          fixtures={config.fixtures}
          getChannel={getChannel}
          overrideMap={overrideMap}
          onFixtureVizChange={handleFixtureVizChange}
          onPopout={() => setVizPopped(true)}
        />
      )}

      {showsOpen && (
        <ShowsModal
          onLoad={(imported, name) => { setConfig(imported); setCurrentShowName(name); setDirty(false) }}
          onSaved={(name) => { setCurrentShowName(name); setDirty(false) }}
          onNew={(fresh) => { setConfig(fresh); setCurrentShowName(null); setDirty(false) }}
          onClose={() => setShowsOpen(false)}
          dirty={dirty}
          currentShowName={currentShowName}
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
