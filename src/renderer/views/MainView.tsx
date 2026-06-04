import { useState, useCallback } from 'react'
import { ScenesStrip } from '../components/ScenesStrip'
import { FixtureFader } from '../components/FixtureFader'
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

  const handleSceneUpdate = useCallback(async (id: string, name: string, fadeDuration: number) => {
    const updated = await ipc.updateScene({ id, name, fadeDuration })
    if (updated) onScenesChange(scenes.map((s) => s.id === id ? updated : s))
  }, [scenes, ipc, onScenesChange])

  const handleSceneDelete = useCallback(async (id: string) => {
    await ipc.deleteScene(id)
    onScenesChange(scenes.filter((s) => s.id !== id))
    setActiveSceneId(null)
  }, [scenes, ipc, onScenesChange])

  const handleSceneReorder = useCallback(async (reordered: Scene[]) => {
    await ipc.reorderScenes(reordered.map((s) => s.id))
    onScenesChange(reordered)
  }, [ipc, onScenesChange])

  // Rename a named fixture (from Scenes view) — empty name removes it
  const handleFixtureRename = useCallback(async (fixture: Fixture, name: string) => {
    if (!name) {
      await ipc.deleteFixture(fixture.id)
      onFixturesChange(fixtures.filter((f) => f.id !== fixture.id))
    } else {
      const updated = await ipc.updateFixture({ ...fixture, name })
      onFixturesChange(fixtures.map((f) => f.id === updated.id ? updated : f))
    }
  }, [fixtures, ipc, onFixturesChange])

  // Rename by channel from Live view — creates fixture if none exists, empty name removes it
  const handleChannelRename = useCallback(async (channel: number, name: string) => {
    const existing = fixtures.find((f) => f.universe === universe && f.channel === channel)
    if (!name) {
      if (existing) {
        await ipc.deleteFixture(existing.id)
        onFixturesChange(fixtures.filter((f) => f.id !== existing.id))
      }
      return
    }
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
            onUpdate={handleSceneUpdate}
            onDelete={handleSceneDelete}
            onReorder={handleSceneReorder}
          />
          <div className={styles.fixtures}>
            {sorted.map((fixture) => (
              <FixtureFader
                key={fixture.id}
                channel={fixture.channel}
                name={fixture.name}
                value={getChannel(fixture.universe, fixture.channel)}
                onChange={(v) => handleSetChannel(fixture, v)}
                onRename={(name) => handleFixtureRename(fixture, name)}
              />
            ))}
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
          onAllOff={() => setActiveSceneId(null)}
        />
      )}
    </div>
  )
}
