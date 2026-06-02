import { useState, useCallback } from 'react'
import { ScenesStrip } from '../components/ScenesStrip'
import { FixtureFader } from '../components/FixtureFader'
import { FixtureToggle } from '../components/FixtureToggle'
import { useIpc } from '../hooks/useIpc'
import { useDmxState } from '../hooks/useDmxState'
import type { Fixture, Scene } from '../../shared/types'
import styles from './MainView.module.css'

interface Props {
  fixtures: Fixture[]
  scenes: Scene[]
  onScenesChange: (scenes: Scene[]) => void
}

export function MainView({ fixtures, scenes, onScenesChange }: Props) {
  const ipc = useIpc()
  const { getChannel, setChannel: setLocal, applyScene } = useDmxState()
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)

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

  const sorted = [...fixtures].sort((a, b) => a.channel - b.channel)

  return (
    <div className={styles.view}>
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
    </div>
  )
}
