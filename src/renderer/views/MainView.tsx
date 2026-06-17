import { useState, useCallback, useEffect, useMemo } from 'react'
import { ScenesStrip } from '../components/ScenesStrip'
import { FixtureFader } from '../components/FixtureFader'
import { GroupStrip } from '../components/GroupStrip'
import { AddFixturesModal } from '../components/AddFixturesModal'
import { MultiFixtureFader } from '../components/MultiFixtureFader'
import { CreateFixtureModal } from '../components/CreateFixtureModal'
import { LiveView } from './LiveView'
import { useIpc } from '../hooks/useIpc'
import { useDmxState } from '../hooks/useDmxState'
import type { Fixture, Scene, Group, GroupChannelOverride, FixtureTemplate } from '../../shared/types'
import styles from './MainView.module.css'

type Tab = 'custom' | 'full'
type GroupState = { fader: number; override: 'full' | 'mute' | null }

interface Props {
  fixtures: Fixture[]
  scenes: Scene[]
  groups: Group[]
  onScenesChange: (scenes: Scene[]) => void
  onFixturesChange: (fixtures: Fixture[]) => void
  onGroupsChange: (groups: Group[]) => void
  currentShowName?: string | null
  onSave?: () => void
}

export function MainView({ fixtures, scenes, groups, onScenesChange, onFixturesChange, onGroupsChange, currentShowName = null, onSave }: Props) {
  const ipc = useIpc()
  const { getChannel, setChannel: setLocal, applyScene } = useDmxState()
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('custom')
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>({})
  const [addingFixtures, setAddingFixtures] = useState(false)
  const [creatingFixture, setCreatingFixture] = useState(false)
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null)
  const [fixtureTemplates, setFixtureTemplates] = useState<FixtureTemplate[]>(() => [])

  // Sync UI when Companion activates a scene externally
  useEffect(() => {
    window.electronAPI.onSceneActivated((sceneId) => {
      const scene = scenes.find((s) => s.id === sceneId)
      if (!scene) return
      setActiveSceneId(sceneId)
      applyScene(scene.values, fixtures)
    })
  }, [scenes, fixtures, applyScene])

  useEffect(() => {
    window.electronAPI.getConfig().then((cfg) => {
      setFixtureTemplates(cfg.fixtureTemplates ?? [])
    })
  }, [])

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
        if (fixture.channels) {
          if (state.override !== 'full') {
            for (const ch of fixture.channels) {
              map[`${ch.universe}-${ch.channel}`] = channelOverride
            }
          }
        } else {
          map[`${fixture.universe}-${fixture.channel}`] = channelOverride
        }
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

  const handleAllOff = useCallback(() => {
    for (const u of [0, 1] as const) {
      for (let ch = 1; ch <= 512; ch++) {
        setLocal(u, ch, 0)
        ipc.setChannel({ universe: u, channel: ch, value: 0 })
      }
    }
    setActiveSceneId(null)
  }, [ipc, setLocal])

  const handleGroupReorder = useCallback(async (reordered: Group[]) => {
    await ipc.reorderGroups(reordered.map((g) => g.id))
    onGroupsChange(reordered)
  }, [ipc, onGroupsChange])

  const handleSetChannel = useCallback((fixture: Fixture, value: number) => {
    setLocal(fixture.universe, fixture.channel, value)
    ipc.setChannel({ universe: fixture.universe, channel: fixture.channel, value })
  }, [ipc, setLocal])

  const handleMultiFixtureChange = useCallback((fixture: Fixture, newValues: Record<string, number>) => {
    for (const [id, value] of Object.entries(newValues)) {
      const ch = fixture.channels?.find((c) => c.id === id)
      if (!ch) continue
      setLocal(ch.universe, ch.channel, value)
      ipc.setChannel({ universe: ch.universe, channel: ch.channel, value })
    }
  }, [ipc, setLocal])

  const handleCreateFixture = useCallback(async (fixture: Fixture) => {
    const saved = await ipc.updateFixture(fixture)
    const exists = fixtures.some((f) => f.id === saved.id)
    onFixturesChange(exists
      ? fixtures.map((f) => f.id === saved.id ? saved : f)
      : [...fixtures, saved]
    )
    setCreatingFixture(false)
    setEditingFixture(null)
  }, [fixtures, ipc, onFixturesChange])

  const handleSaveTemplate = useCallback(async (template: FixtureTemplate) => {
    const updated = await window.electronAPI.saveFixtureTemplate(template)
    setFixtureTemplates(updated)
  }, [])

  const handleDeleteTemplate = useCallback(async (id: string) => {
    const updated = await window.electronAPI.deleteFixtureTemplate(id)
    setFixtureTemplates(updated)
  }, [])

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
      if (f.channels) {
        for (const ch of f.channels) {
          values[ch.id] = getChannel(ch.universe, ch.channel)
        }
      } else {
        values[f.id] = getChannel(f.universe, f.channel)
      }
    }
    const saved = await ipc.saveScene({ name, fadeDuration, values })
    onScenesChange([...scenes, saved])
  }, [fixtures, scenes, ipc, getChannel, onScenesChange])

  const handleSceneUpdate = useCallback(async (id: string, name: string, fadeDuration: number) => {
    const updated = await ipc.updateScene({ id, name, fadeDuration })
    if (!updated) return
    onScenesChange(scenes.map((s) => s.id === id ? updated : s))
    if (activeSceneId === id) setActiveSceneId(updated.id)
  }, [scenes, ipc, onScenesChange, activeSceneId])

  const handleSceneDelete = useCallback(async (id: string) => {
    await ipc.deleteScene(id)
    onScenesChange(scenes.filter((s) => s.id !== id))
    setActiveSceneId(null)
  }, [scenes, ipc, onScenesChange])

  const handleSceneReorder = useCallback(async (reordered: Scene[]) => {
    await ipc.reorderScenes(reordered.map((s) => s.id))
    onScenesChange(reordered)
  }, [ipc, onScenesChange])

  const handleEditFixtures = useCallback(async (toAdd: Fixture[], toRemoveIds: string[], toUpdate: Fixture[]) => {
    const added = await Promise.all(toAdd.map((f) => ipc.updateFixture(f)))
    await Promise.all(toRemoveIds.map((id) => ipc.deleteFixture(id)))
    const updated = await Promise.all(toUpdate.map((f) => ipc.updateFixture(f)))
    let next = fixtures.filter((f) => !toRemoveIds.includes(f.id))
    next = next.map((f) => updated.find((u) => u.id === f.id) ?? f)
    onFixturesChange([...next, ...added])
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

  const handleChannelRename = useCallback(async (universe: 0 | 1, channel: number, name: string) => {
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
  }, [fixtures, ipc, onFixturesChange])

  const getFixtureGroupColor = useCallback((fixtureId: string): string | undefined => {
    return groups.find((g) => g.fixtureIds.includes(fixtureId))?.color
  }, [groups])

  const getFixtureOverride = useCallback((fixtureId: string): 'full' | 'mute' | null => {
    const group = groups.find((g) => g.fixtureIds.includes(fixtureId))
    if (!group) return null
    return groupStates[group.id]?.override ?? null
  }, [groups, groupStates])

  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({ scenes: false, groups: false, fixturesU0: false, fixturesU1: false })
  const toggleSection = (key: string) => setSectionsCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  const sorted = [...fixtures].sort((a, b) => a.channel - b.channel)
  const fixturesByUniverse = {
    0: sorted.filter((f) => (f.channels ? f.channels[0]?.universe : f.universe) === 0),
    1: sorted.filter((f) => (f.channels ? f.channels[0]?.universe : f.universe) === 1),
  }

  return (
    <div className={styles.view}>
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab}${tab === 'full' ? ` ${styles.active}` : ''}`}
          onClick={() => setTab('full')}
        >
          Full
        </button>
        <button
          className={`${styles.tab}${tab === 'custom' ? ` ${styles.active}` : ''}`}
          onClick={() => setTab('custom')}
        >
          Custom
        </button>
        <button className={styles.allOffBtn} onClick={handleAllOff} title="Turn all channels off">
          ✕ All Off
        </button>
      </div>

      {tab === 'custom' && (
        <>
          <div className={styles.section}>
            <button className={styles.sectionLabel} onClick={() => toggleSection('scenes')}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: sectionsCollapsed.scenes ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
              Scenes
            </button>
            {!sectionsCollapsed.scenes && (
              <ScenesStrip
                scenes={scenes}
                activeSceneId={activeSceneId}
                onActivate={handleActivate}
                onSave={handleSave}
                onUpdate={handleSceneUpdate}
                onDelete={handleSceneDelete}
                onReorder={handleSceneReorder}
              />
            )}
          </div>
          <div className={styles.section}>
            <button className={styles.sectionLabel} onClick={() => toggleSection('groups')}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: sectionsCollapsed.groups ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
              Groups
            </button>
            {!sectionsCollapsed.groups && (
              <GroupStrip
                groups={groups}
                fixtures={fixtures}
                groupStates={groupStates}
                onStateChange={handleStateChange}
                onSaveGroup={handleSaveGroup}
                onDeleteGroup={handleDeleteGroup}
                onReorder={handleGroupReorder}
              />
            )}
          </div>
          <div className={styles.addFixtureRow}>
            <button className={styles.addFixtureBtn} onClick={() => setAddingFixtures(true)}>
              + Add Channels
            </button>
            <button className={styles.addFixtureBtn} onClick={() => setCreatingFixture(true)}>
              + Add Custom Fixture
            </button>
          </div>
          <div className={styles.fixturesSection}>
            {fixtures.length === 0 && (
              <p className={styles.empty}>No fixtures yet — click "+ Add Channels" to get started.</p>
            )}
            {([0, 1] as const).map((u) => fixturesByUniverse[u].length === 0 ? null : (
              <div key={u} className={styles.universeGroup}>
                <button className={styles.sectionLabel} onClick={() => toggleSection(`fixturesU${u}`)}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: sectionsCollapsed[`fixturesU${u}`] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                  Universe {u + 1}
                </button>
                {!sectionsCollapsed[`fixturesU${u}`] && (
                  <div className={styles.fixtures}>
                    {fixturesByUniverse[u].map((fixture) =>
                      fixture.channels ? (
                        <MultiFixtureFader
                          key={fixture.id}
                          fixture={fixture}
                          values={Object.fromEntries(
                            fixture.channels.map((ch) => [ch.id, getChannel(ch.universe, ch.channel)])
                          )}
                          onChange={(newValues) => handleMultiFixtureChange(fixture, newValues)}
                          onRename={(name) => handleFixtureRename(fixture, name)}
                          onEdit={() => setEditingFixture(fixture)}
                          groupColor={getFixtureGroupColor(fixture.id)}
                          groupOverride={getFixtureOverride(fixture.id)}
                        />
                      ) : (
                        <FixtureFader
                          key={fixture.id}
                          channel={fixture.channel}
                          universe={fixture.universe}
                          name={fixture.name}
                          value={getChannel(fixture.universe, fixture.channel)}
                          onChange={(v) => handleSetChannel(fixture, v)}
                          onRename={(name) => handleFixtureRename(fixture, name)}
                          groupColor={getFixtureGroupColor(fixture.id)}
                          groupOverride={getFixtureOverride(fixture.id)}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {addingFixtures && (
        <AddFixturesModal
          existingFixtures={fixtures}
          onApply={handleEditFixtures}
          onClose={() => setAddingFixtures(false)}
        />
      )}

      {creatingFixture && (
        <CreateFixtureModal
          templates={fixtureTemplates}
          existingFixtures={fixtures}
          onApply={handleCreateFixture}
          onTemplateSave={handleSaveTemplate}
          onTemplateDelete={handleDeleteTemplate}
          onClose={() => setCreatingFixture(false)}
        />
      )}

      {editingFixture && (
        <CreateFixtureModal
          templates={fixtureTemplates}
          existingFixtures={fixtures}
          initialFixture={editingFixture}
          onApply={handleCreateFixture}
          onTemplateSave={handleSaveTemplate}
          onTemplateDelete={handleDeleteTemplate}
          onClose={() => setEditingFixture(null)}
        />
      )}

      {tab === 'full' && (
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
          <LiveView
            fixtures={fixtures}
            getChannel={getChannel}
            setChannel={setLocal}
            onRename={handleChannelRename}
          />
        </>
      )}
    </div>
  )
}
