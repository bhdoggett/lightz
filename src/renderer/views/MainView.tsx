import { useCallback } from 'react'
import { ScenesStrip } from '../components/ScenesStrip'
import { FixtureFader } from '../components/FixtureFader'
import { FixtureToggle } from '../components/FixtureToggle'
import { useIpc } from '../hooks/useIpc'
import { useDmxState } from '../hooks/useDmxState'
import type { Fixture, Scene } from '../../shared/types'

interface Props {
  fixtures: Fixture[]
  scenes: Scene[]
  activeSceneId: string | null
  onActivate: (id: string) => void
  onScenesChange: (scenes: Scene[]) => void
  onActiveSceneChange: (id: string | null) => void
}

export function MainView({ fixtures, scenes, activeSceneId, onActivate, onScenesChange, onActiveSceneChange }: Props) {
  const ipc = useIpc()
  const { getChannel, setChannel: setLocal, applyScene } = useDmxState()

  const handleSetChannel = useCallback((fixture: Fixture, value: number) => {
    setLocal(fixture.universe, fixture.channel, value)
    ipc.setChannel({ universe: fixture.universe, channel: fixture.channel, value })
  }, [ipc, setLocal])

  const handleActivate = useCallback(async (id: string) => {
    const scene = scenes.find((s) => s.id === id)
    if (!scene) return
    onActiveSceneChange(id)
    applyScene(scene.values, fixtures)
    onActivate(id)
    await ipc.loadScene(id)
  }, [scenes, fixtures, ipc, applyScene, onActivate, onActiveSceneChange])

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ScenesStrip
        scenes={scenes}
        activeSceneId={activeSceneId}
        onActivate={handleActivate}
        onSave={handleSave}
      />
      <div style={{ flex: 1, padding: 24, display: 'flex', flexWrap: 'wrap', gap: 24, alignContent: 'flex-start', overflowY: 'auto' }}>
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
          <p style={{ color: '#6b7280' }}>No fixtures configured. Go to Setup to add fixtures.</p>
        )}
      </div>
    </div>
  )
}
