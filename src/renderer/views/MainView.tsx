import { useState, useCallback, useEffect, useMemo } from 'react'
import { ScenesStrip } from '../components/ScenesStrip'
import { FixtureFader } from '../components/FixtureFader'
import { GroupStrip } from '../components/GroupStrip'
import { AddFixturesModal } from '../components/AddFixturesModal'
import { LiveView } from './LiveView'
import { useIpc } from '../hooks/useIpc'
import { useDmxState } from '../hooks/useDmxState'
import type { Fixture, Scene, Group, GroupChannelOverride } from '../../shared/types'
import styles from './MainView.module.css'

type Tab = 'custom' | 'live'
type GroupState = { fader: number; override: 'full' | 'mute' | null }

interface Props {
  fixtures: Fixture[]
  scenes: Scene[]
  groups: Group[]
  onScenesChange: (scenes: Scene[]) => void
  onFixturesChange: (fixtures: Fixture[]) => void
  onGroupsChange: (groups: Group[]) => void
}

export function MainView({ fixtures, scenes, groups, onScenesChange, onFixturesChange, onGroupsChange }: Props) {
  const ipc = useIpc()
  const { getChannel, setChannel: setLocal, applyScene } = useDmxState()
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('custom')
  const [universe, setUniverse] = useState<0 | 1>(0)
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>({})
  const [addingFixtures, setAddingFixtures] = useState(false)

  // Initialise runtime state for any new group
  useEffect(() => {
    setGroupStates((prev) => {
      const next = { ...prev }
      for (const g of groups) {
        if (!next[g.id]) next[g.id] = { fader: 100, override: null }
      }
      return next
    })
  }, [groups])

  // Build and push override map whenever groups or group states change
  const overrideMap = useMemo(() => {
    const map: Record<string, GroupChannelOverride> = {}
    for (const group of groups) {
      const state = groupStates[group.id] ?? { fader: 100, override: null }
      const channelOverride: GroupChannelOverride =
        state.override === 'full' ? { kind: 'full' } :
        state.override === 'mute' ? { kind: 'mute' } :
        { kind: 'percent', multiplier: state.fader / 100 }
      for (const fixtureId of group.fixtureIds) {
        const fixture = fixtures.find((f) => f.id === fixtureId)
        if (!fixture) continue
        map[`${fixture.universe}-${fixture.channel}`] = channelOverride
      }
    }
    return map
  }, [groups, groupStates, fixtures])

  useEffect(() => {
    ipc.setGroupOverrides(overrideMap)
  }, [overrideMap, ipc])

  const handleStateChange = useCallback((groupId: string, state: GroupState) => {
    setGroupStates((prev) => ({ ...prev, [groupId]: state }))
  }, [])

  const handleSaveGroup = useCallback(async (group: Group) => {
    const updated = await ipc.saveGroup(group)
    if (updated) onGroupsChange(updated)
  }, [ipc, onGroupsChange])

  const handleDeleteGroup = useCallback(async (id: string) => {
    await ipc.deleteGroup(id)
    onGroupsChange(groups.filter((g) => g.id !== id))
    setGroupStates((prev) => { const n = { ...prev }; delete n[id]; return n })
  }, [groups, ipc, onGroupsChange])

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

  const handleAddFixtures = useCallback(async (newFixtures: Fixture[]) => {
    const saved = await Promise.all(newFixtures.map((f) => ipc.updateFixture(f)))
    onFixturesChange([...fixtures, ...saved])
    setAddingFixtures(false)
  }, [fixtures, ipc, onFixturesChange])

  const handleFixtureRename = useCallback(async (fixture: Fixture, name: string) => {
    if (!name) {
      await ipc.deleteFixture(fixture.id)
      onFixturesChange(fixtures.filter((f) => f.id !== fixture.id))
    } else {
      const updated = await ipc.updateFixture({ ...fixture, name })
      onFixturesChange(fixtures.map((f) => f.id === updated.id ? updated : f))
    }
  }, [fixtures, ipc, onFixturesChange])

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

  const getFixtureGroupColor = useCallback((fixtureId: string): string | undefined => {
    return groups.find((g) => g.fixtureIds.includes(fixtureId))?.color
  }, [groups])

  const getFixtureOverride = useCallback((fixtureId: string): 'full' | 'mute' | null => {
    const group = groups.find((g) => g.fixtureIds.includes(fixtureId))
    if (!group) return null
    return groupStates[group.id]?.override ?? null
  }, [groups, groupStates])

  const sorted = [...fixtures].sort((a, b) => a.channel - b.channel)

  return (
    <div className={styles.view}>
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab}${tab === 'live' ? ` ${styles.active}` : ''}`}
          onClick={() => setTab('live')}
        >
          Live
        </button>
        <button
          className={`${styles.tab}${tab === 'custom' ? ` ${styles.active}` : ''}`}
          onClick={() => setTab('custom')}
        >
          Custom
        </button>
        {tab === 'live' && (
          <div className={styles.universeToggle}>
            <button
              className={`${styles.uBtn}${universe === 0 ? ` ${styles.active}` : ''}`}
              onClick={() => setUniverse(0)}
            >U1</button>
            <button
              className={`${styles.uBtn}${universe === 1 ? ` ${styles.active}` : ''}`}
              onClick={() => setUniverse(1)}
            >U2</button>
          </div>
        )}
      </div>

      {tab === 'custom' && (
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
          <GroupStrip
            groups={groups}
            fixtures={fixtures}
            groupStates={groupStates}
            onStateChange={handleStateChange}
            onSaveGroup={handleSaveGroup}
            onDeleteGroup={handleDeleteGroup}
          />
          <div className={styles.addFixtureRow}>
            <button className={styles.addFixtureBtn} onClick={() => setAddingFixtures(true)}>
              + Add Fixtures
            </button>
          </div>
          <div className={styles.fixtures}>
            {sorted.map((fixture) => (
              <FixtureFader
                key={fixture.id}
                channel={fixture.channel}
                name={fixture.name}
                value={getChannel(fixture.universe, fixture.channel)}
                onChange={(v) => handleSetChannel(fixture, v)}
                onRename={(name) => handleFixtureRename(fixture, name)}
                groupColor={getFixtureGroupColor(fixture.id)}
                groupOverride={getFixtureOverride(fixture.id)}
              />
            ))}
            {fixtures.length === 0 && (
              <p className={styles.empty}>No fixtures yet — click "+ Add Fixtures" to get started.</p>
            )}
          </div>
        </>
      )}

      {addingFixtures && (
        <AddFixturesModal
          existingFixtures={fixtures}
          onAdd={handleAddFixtures}
          onClose={() => setAddingFixtures(false)}
        />
      )}

      {tab === 'live' && (
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
