import { useState, useCallback } from 'react'
import { ScenesStrip } from '../components/ScenesStrip'
import { FixtureFader } from '../components/FixtureFader'
import { FixtureToggle } from '../components/FixtureToggle'
import { LiveView } from './LiveView'
import { useIpc } from '../hooks/useIpc'
import { useDmxState } from '../hooks/useDmxState'
import type { Fixture, Scene } from '../../shared/types'
import styles from './MainView.module.css'

type Tab = 'scenes' | 'live'

interface Props {
  fixtures: Fixture[]
  scenes: Scene[]
  onScenesChange: (scenes: Scene[]) => void
  onFixturesChange: (fixtures: Fixture[]) => void
}

export function MainView({ fixtures, scenes, onScenesChange, onFixturesChange }: Props) {
  const ipc = useIpc()
  const { getChannel, setChannel: setLocal, applyScene } = useDmxState()
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('scenes')
  const [universe, setUniverse] = useState<0 | 1>(0)

  const handleSetChannel = useCallback((fixture: Fixture, value: number) => {
    setLocal(fixture.universe, fixture.channel, value)
    ipc.setChannel({ universe: fixture.universe, channel: fixture.channel, value })
  }, [ipc, setLocal])

  const handleActivate = useCallback(async (id: string) => {
    const scene = scenes.find((s) => s.id === id)
    if (!scene) return
    setActiveSceneId(id)
    applyScene(scene.values, fixtures)
    await ipc.loadScene(id)
  }, [scenes, fixtures, ipc, applyScene])

  const handleSave = useCallback(async (name: string, fadeDuration: number) => {
    const values: Record<string, number> = {}
    for (const f of fixtures) {
      values[f.id] = getChannel(f.universe, f.channel)
    }
    const saved = await ipc.saveScene({ name, fadeDuration, values })
    onScenesChange([...scenes, saved])
  }, [fixtures, scenes, ipc, getChannel, onScenesChange])

  // Rename a named fixture (from Scenes view)
  const handleFixtureRename = useCallback(async (fixture: Fixture, name: string) => {
    const updated = await ipc.updateFixture({ ...fixture, name })
    onFixturesChange(fixtures.map((f) => f.id === updated.id ? updated : f))
  }, [fixtures, ipc, onFixturesChange])

  // Rename by channel from Live view — creates fixture if none exists
  const handleChannelRename = useCallback(async (channel: number, name: string) => {
    const existing = fixtures.find((f) => f.universe === universe && f.channel === channel)
    const fixtureToSave: Fixture = existing
      ? { ...existing, name }
      : { id: crypto.randomUUID(), name, channel, universe, type: 'dimmer' }
    const saved = await ipc.updateFixture(fixtureToSave)
    if (existing) {
      onFixturesChange(fixtures.map((f) => f.id === saved.id ? saved : f))
    } else {
      onFixturesChange([...fixtures, saved])
    }
  }, [fixtures, universe, ipc, onFixturesChange])

  const sorted = [...fixtures].sort((a, b) => a.channel - b.channel)

  return (
    <div className={styles.view}>
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab}${tab === 'scenes' ? ` ${styles.active}` : ''}`}
          onClick={() => setTab('scenes')}
        >
          Scenes
        </button>
        <button
          className={`${styles.tab}${tab === 'live' ? ` ${styles.active}` : ''}`}
          onClick={() => setTab('live')}
        >
          Live
        </button>
        {tab === 'live' && (
          <div className={styles.universeToggle}>
            <button
              className={`${styles.uBtn}${universe === 0 ? ` ${styles.active}` : ''}`}
              onClick={() => setUniverse(0)}
            >
              U1
            </button>
            <button
              className={`${styles.uBtn}${universe === 1 ? ` ${styles.active}` : ''}`}
              onClick={() => setUniverse(1)}
            >
              U2
            </button>
          </div>
        )}
      </div>

      {tab === 'scenes' ? (
        <>
          <ScenesStrip
            scenes={scenes}
            activeSceneId={activeSceneId}
            onActivate={handleActivate}
            onSave={handleSave}
          />
          <div className={styles.fixtures}>
            {sorted.map((fixture) =>
              fixture.type === 'dimmer' ? (
                <FixtureFader
                  key={fixture.id}
                  name={fixture.name}
                  value={getChannel(fixture.universe, fixture.channel)}
                  onChange={(v) => handleSetChannel(fixture, v)}
                  onRename={(name) => handleFixtureRename(fixture, name)}
                />
              ) : (
                <FixtureToggle
                  key={fixture.id}
                  name={fixture.name}
                  value={getChannel(fixture.universe, fixture.channel)}
                  onChange={(v) => handleSetChannel(fixture, v)}
                />
              )
            )}
            {fixtures.length === 0 && (
              <p className={styles.empty}>No fixtures configured. Go to Setup to add fixtures.</p>
            )}
          </div>
        </>
      ) : (
        <LiveView
          universe={universe}
          fixtures={fixtures}
          getChannel={getChannel}
          setChannel={setLocal}
          onRename={handleChannelRename}
        />
      )}
    </div>
  )
}
