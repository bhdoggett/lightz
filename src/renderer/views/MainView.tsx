import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { ScenesStrip } from '../components/ScenesStrip'
import { FixtureFader } from '../components/FixtureFader'
import { GroupStrip } from '../components/GroupStrip'
import { GroupCard } from '../components/GroupCard'
import { GroupEditor } from '../components/GroupEditor'
import { Modal } from '../components/Modal'
import { AddFixturesModal } from '../components/AddFixturesModal'
import { MultiFixtureFader } from '../components/MultiFixtureFader'
import { CreateFixtureModal } from '../components/CreateFixtureModal'
import { LiveView } from './LiveView'
import { useApi } from '../api/context'
import { useDragReorder } from '../hooks/useDragReorder'
import type { Fixture, Scene, Group, GroupState, GroupChannelOverride, FixtureTemplate } from '../../shared/types'
import styles from './MainView.module.css'

type Tab = 'custom' | 'full'

interface Props {
  fixtures: Fixture[]
  scenes: Scene[]
  groups: Group[]
  onScenesChange: (scenes: Scene[]) => void
  onFixturesChange: (fixtures: Fixture[]) => void
  onGroupsChange: (groups: Group[]) => void
  currentShowName?: string | null
  onSave?: () => void
  getChannel: (universe: 0 | 1, channel: number) => number
  setChannel: (universe: 0 | 1, channel: number, value: number) => void
  applyScene: (values: Record<string, number>, fixtures: Fixture[]) => void
  onOverrideMapChange?: (map: Record<string, GroupChannelOverride>) => void
  fixtureSectionOrder?: string[]
  showGroupStrip?: boolean
  onSectionReorder: (ids: string[]) => void
  onToggleGroupStrip: () => void
}

export function deriveSectionOrder(
  stored: string[] | undefined,
  fixtures: Fixture[],
  groups: Group[]
): string[] {
  const groupedFixtureIds = new Set(groups.flatMap((g) => g.fixtureIds))
  const allSectionIds = new Set([
    ...groups.map((g) => g.id),
    ...fixtures.filter((f) => !groupedFixtureIds.has(f.id)).map((f) => f.id),
  ])
  if (!stored) {
    const ungrouped = fixtures
      .filter((f) => !groupedFixtureIds.has(f.id))
      .sort((a, b) => a.channel - b.channel)
      .map((f) => f.id)
    return [...groups.map((g) => g.id), ...ungrouped]
  }
  const known = stored.filter((id) => allSectionIds.has(id))
  const missing = [...allSectionIds].filter((id) => !stored.includes(id))
  return [...known, ...missing]
}

export function MainView({
  fixtures, scenes, groups,
  onScenesChange, onFixturesChange, onGroupsChange,
  currentShowName = null, onSave, getChannel, setChannel: setLocal, applyScene, onOverrideMapChange,
  fixtureSectionOrder: storedOrder,
  showGroupStrip = true,
  onSectionReorder,
  onToggleGroupStrip,
}: Props) {
  const api = useApi()
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('custom')
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>({})
  const [addingFixtures, setAddingFixtures] = useState(false)
  const [creatingFixture, setCreatingFixture] = useState(false)
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null)
  const [fixtureTemplates, setFixtureTemplates] = useState<FixtureTemplate[]>(() => [])
  const [editingGroupId, setEditingGroupId] = useState<string | 'new' | null>(null)

  const [sceneSaveTrigger, setSceneSaveTrigger] = useState(0)
  const [sceneEditTrigger, setSceneEditTrigger] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active as HTMLElement)?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (e.key === 'f') { e.preventDefault(); setTab('full') }
      else if (e.key === 'c') { e.preventDefault(); setTab('custom') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    api.onMenuViewFull(() => setTab('full'))
    api.onMenuViewCustom(() => setTab('custom'))
    api.onMenuAddChannels(() => { setTab('custom'); setAddingFixtures(true) })
    api.onMenuAddFixture(() => { setTab('custom'); setCreatingFixture(true) })
    api.onMenuAddScene(() => {
      setTab('custom')
      setSectionsCollapsed((prev) => ({ ...prev, scenes: false }))
      setSceneSaveTrigger((n) => n + 1)
    })
    api.onMenuAddGroup(() => { setTab('custom'); setEditingGroupId('new') })
  }, [])

  // Sync UI when Companion activates a scene externally
  useEffect(() => {
    api.onSceneActivated((sceneId) => {
      const scene = scenes.find((s) => s.id === sceneId)
      if (!scene) return
      setActiveSceneId(sceneId)
      applyScene(scene.values, fixtures)
      setGroupStates(() => {
        const next: Record<string, GroupState> = {}
        for (const g of groups) {
          next[g.id] = scene.groupStates?.[g.id] ?? { fader: 100 }
        }
        return next
      })
    })
  }, [scenes, fixtures, groups, applyScene])

  useEffect(() => {
    api.getConfig().then((cfg) => {
      setFixtureTemplates(cfg.fixtureTemplates ?? [])
    })
  }, [])

  // Initialise runtime state for any new group
  useEffect(() => {
    setGroupStates((prev) => {
      const next = { ...prev }
      for (const g of groups) {
        if (!next[g.id]) next[g.id] = { fader: 100 }
      }
      return next
    })
  }, [groups])

  // Build and push override map whenever groups or group states change
  const overrideMap = useMemo(() => {
    const map: Record<string, GroupChannelOverride> = {}
    for (const group of groups) {
      const state = groupStates[group.id] ?? { fader: 100 }
      const channelOverride: GroupChannelOverride = { kind: 'percent', multiplier: state.fader / 100 }
      for (const fixtureId of group.fixtureIds) {
        const fixture = fixtures.find((f) => f.id === fixtureId)
        if (!fixture) continue
        if (fixture.channels) {
          for (const ch of fixture.channels) {
            map[`${ch.universe}-${ch.channel}`] = channelOverride
          }
        } else {
          map[`${fixture.universe}-${fixture.channel}`] = channelOverride
        }
      }
    }
    return map
  }, [groups, groupStates, fixtures])

  useEffect(() => {
    api.setGroupOverrides(overrideMap)
    onOverrideMapChange?.(overrideMap)
  }, [overrideMap, api, onOverrideMapChange])

  const handleStateChange = useCallback((groupId: string, state: GroupState) => {
    setGroupStates((prev) => ({ ...prev, [groupId]: state }))
  }, [])

  const handleSaveGroup = useCallback(async (group: Group) => {
    const updated = await api.saveGroup(group)
    if (updated) onGroupsChange(updated)
  }, [api, onGroupsChange])

  const handleDeleteGroup = useCallback(async (id: string) => {
    await api.deleteGroup(id)
    onGroupsChange(groups.filter((g) => g.id !== id))
    setGroupStates((prev) => { const n = { ...prev }; delete n[id]; return n })
  }, [groups, api, onGroupsChange])

  const handleAllOff = useCallback(() => {
    for (const u of [0, 1] as const) {
      for (let ch = 1; ch <= 512; ch++) {
        setLocal(u, ch, 0)
        api.setChannel({ universe: u, channel: ch, value: 0 })
      }
    }
    setGroupStates((prev) => {
      const reset: Record<string, GroupState> = {}
      for (const id of Object.keys(prev)) reset[id] = { fader: 100 }
      return reset
    })
    setActiveSceneId(null)
  }, [api, setLocal])

  const allOffRef = useRef(handleAllOff)
  allOffRef.current = handleAllOff
  useEffect(() => {
    api.onMenuAllOff(() => allOffRef.current())
  }, [])

  const handleGroupReorder = useCallback(async (reordered: Group[]) => {
    await api.reorderGroups(reordered.map((g) => g.id))
    onGroupsChange(reordered)
  }, [api, onGroupsChange])

  const setGroupChannels = useCallback((groupId: string, value: number) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return
    for (const fixtureId of group.fixtureIds) {
      const fixture = fixtures.find((f) => f.id === fixtureId)
      if (!fixture) continue
      if (fixture.channels) {
        for (const ch of fixture.channels) {
          setLocal(ch.universe, ch.channel, value)
          api.setChannel({ universe: ch.universe, channel: ch.channel, value })
        }
      } else {
        setLocal(fixture.universe, fixture.channel, value)
        api.setChannel({ universe: fixture.universe, channel: fixture.channel, value })
      }
    }
  }, [groups, fixtures, api, setLocal])

  const handleSetChannel = useCallback((fixture: Fixture, value: number) => {
    setLocal(fixture.universe, fixture.channel, value)
    api.setChannel({ universe: fixture.universe, channel: fixture.channel, value })
  }, [api, setLocal])

  const handleMultiFixtureChange = useCallback((fixture: Fixture, newValues: Record<string, number>) => {
    for (const [id, value] of Object.entries(newValues)) {
      const ch = fixture.channels?.find((c) => c.id === id)
      if (!ch) continue
      setLocal(ch.universe, ch.channel, value)
      api.setChannel({ universe: ch.universe, channel: ch.channel, value })
    }
  }, [api, setLocal])

  const handleCreateFixture = useCallback(async (fixture: Fixture) => {
    const saved = await api.updateFixture(fixture)
    const exists = fixtures.some((f) => f.id === saved.id)
    onFixturesChange(exists
      ? fixtures.map((f) => f.id === saved.id ? saved : f)
      : [...fixtures, saved]
    )
    setCreatingFixture(false)
    setEditingFixture(null)
  }, [fixtures, api, onFixturesChange])

  const handleSaveTemplate = useCallback(async (template: FixtureTemplate) => {
    const updated = await api.saveFixtureTemplate(template)
    setFixtureTemplates(updated)
  }, [])

  const handleDeleteTemplate = useCallback(async (id: string) => {
    const updated = await api.deleteFixtureTemplate(id)
    setFixtureTemplates(updated)
  }, [])

  const handleActivate = useCallback(async (id: string) => {
    const scene = scenes.find((s) => s.id === id)
    if (!scene) return
    setActiveSceneId(id)
    applyScene(scene.values, fixtures)
    setGroupStates(() => {
      const next: Record<string, GroupState> = {}
      for (const g of groups) {
        next[g.id] = scene.groupStates?.[g.id] ?? { fader: 100 }
      }
      return next
    })
    await api.loadScene(id)
  }, [scenes, fixtures, groups, api, applyScene])

  const handleSave = useCallback(async (name: string, fadeDuration: number, groupStates: Record<string, GroupState>) => {
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
    const saved = await api.saveScene({ name, fadeDuration, values, groupStates })
    onScenesChange([...scenes, saved])
    setActiveSceneId(saved.id)
  }, [fixtures, scenes, api, getChannel, onScenesChange])

  const handleSceneUpdate = useCallback(async (id: string, name: string, fadeDuration: number, groupStates: Record<string, GroupState>) => {
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
    const updated = await api.updateScene({ id, name, fadeDuration, values, groupStates })
    if (!updated) return
    onScenesChange(scenes.map((s) => s.id === id ? updated : s))
    if (activeSceneId === id) setActiveSceneId(updated.id)
  }, [fixtures, scenes, api, getChannel, onScenesChange, activeSceneId])

  const handleSaveSceneValues = useCallback(async () => {
    if (!activeSceneId) return
    const scene = scenes.find((s) => s.id === activeSceneId)
    if (!scene) return
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
    const updated = await api.updateScene({ id: scene.id, name: scene.name, fadeDuration: scene.fadeDuration, values })
    if (updated) onScenesChange(scenes.map((s) => s.id === scene.id ? updated : s))
  }, [activeSceneId, scenes, fixtures, getChannel, api, onScenesChange])

  const saveSceneRef = useRef(handleSaveSceneValues)
  saveSceneRef.current = handleSaveSceneValues
  useEffect(() => {
    api.onMenuSaveScene(() => saveSceneRef.current())
  }, [])

  const handleSceneDelete = useCallback(async (id: string) => {
    await api.deleteScene(id)
    onScenesChange(scenes.filter((s) => s.id !== id))
    setActiveSceneId(null)
  }, [scenes, api, onScenesChange])

  const handleSceneReorder = useCallback(async (reordered: Scene[]) => {
    await api.reorderScenes(reordered.map((s) => s.id))
    onScenesChange(reordered)
  }, [api, onScenesChange])

  const handleEditFixtures = useCallback(async (toAdd: Fixture[], toRemoveIds: string[], toUpdate: Fixture[]) => {
    const added = await Promise.all(toAdd.map((f) => api.updateFixture(f)))
    await Promise.all(toRemoveIds.map((id) => api.deleteFixture(id)))
    const updated = await Promise.all(toUpdate.map((f) => api.updateFixture(f)))
    let next = fixtures.filter((f) => !toRemoveIds.includes(f.id))
    next = next.map((f) => updated.find((u) => u.id === f.id) ?? f)
    onFixturesChange([...next, ...added])
    setAddingFixtures(false)
  }, [fixtures, api, onFixturesChange])

  const handleFixtureRename = useCallback(async (fixture: Fixture, name: string) => {
    if (!name) {
      await api.deleteFixture(fixture.id)
      onFixturesChange(fixtures.filter((f) => f.id !== fixture.id))
    } else {
      const updated = await api.updateFixture({ ...fixture, name })
      onFixturesChange(fixtures.map((f) => f.id === updated.id ? updated : f))
    }
  }, [fixtures, api, onFixturesChange])

  const handleChannelRename = useCallback(async (universe: 0 | 1, channel: number, name: string) => {
    const existing = fixtures.find((f) => f.universe === universe && f.channel === channel)
    if (!name) {
      if (existing) {
        await api.deleteFixture(existing.id)
        onFixturesChange(fixtures.filter((f) => f.id !== existing.id))
      }
      return
    }
    const fixtureToSave: Fixture = existing
      ? { ...existing, name }
      : { id: crypto.randomUUID(), name, channel, universe, type: 'dimmer' }
    const saved = await api.updateFixture(fixtureToSave)
    if (existing) {
      onFixturesChange(fixtures.map((f) => f.id === saved.id ? saved : f))
    } else {
      onFixturesChange([...fixtures, saved])
    }
  }, [fixtures, api, onFixturesChange])

  const getFixtureGroupColor = useCallback((fixtureId: string): string | undefined => {
    return groups.find((g) => g.fixtureIds.includes(fixtureId))?.color
  }, [groups])

  const getFixtureGroupMultiplier = useCallback((fixtureId: string): number | undefined => {
    const group = groups.find((g) => g.fixtureIds.includes(fixtureId))
    if (!group) return undefined
    const state = groupStates[group.id]
    if (!state) return undefined
    return state.fader / 100
  }, [groups, groupStates])

  const [fixturesHorizontal, setFixturesHorizontal] = useState(false)
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({ scenes: false, groups: false })
  const toggleSection = (key: string) => setSectionsCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  // Derived unified section order (groups + ungrouped fixtures)
  const sectionOrder = useMemo(
    () => deriveSectionOrder(storedOrder, fixtures, groups),
    [storedOrder, fixtures, groups]
  )

  const sectionItems = useMemo(() => {
    return sectionOrder.map((id) => {
      const group = groups.find((g) => g.id === id)
      if (group) return { id, kind: 'group' as const, group }
      const fixture = fixtures.find((f) => f.id === id)
      if (fixture) return { id, kind: 'fixture' as const, fixture }
      return null
    }).filter((item): item is NonNullable<typeof item> => item !== null)
  }, [sectionOrder, groups, fixtures])

  const handleSectionReorder = useCallback(async (reordered: typeof sectionItems) => {
    const ids = reordered.map((item) => item.id)
    onSectionReorder(ids)
    await api.reorderFixtureSection(ids)
  }, [api, onSectionReorder])

  const handleDropFixtureOnGroup = useCallback(async (groupId: string, fixtureId: string) => {
    const targetGroup = groups.find((g) => g.id === groupId)
    if (!targetGroup) return
    const updatedGroup = {
      ...targetGroup,
      fixtureIds: [...targetGroup.fixtureIds.filter((id) => id !== fixtureId), fixtureId],
    }
    await handleSaveGroup(updatedGroup)
  }, [groups, handleSaveGroup])

  const { dragId, insertIndex, containerProps, itemProps } = useDragReorder(sectionItems, handleSectionReorder)

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
            <div className={styles.sectionHeader}>
              <button className={styles.sectionLabel} onClick={() => toggleSection('scenes')}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: sectionsCollapsed.scenes ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
                Scenes
              </button>
              {!sectionsCollapsed.scenes && (
                <div className={styles.sectionActions}>
                  {activeSceneId && (
                    <button className={styles.sectionActionBtn} onClick={() => setSceneEditTrigger((n) => n + 1)}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        <path d="m15 5 4 4"/>
                      </svg>
                      Edit Scene
                    </button>
                  )}
                  <button className={styles.sectionActionBtn} onClick={() => setSceneSaveTrigger((n) => n + 1)}>+ Save Scene</button>
                </div>
              )}
            </div>
            {!sectionsCollapsed.scenes && (
              <ScenesStrip
                scenes={scenes}
                activeSceneId={activeSceneId}
                groups={groups}
                currentGroupStates={groupStates}
                onActivate={handleActivate}
                onSave={handleSave}
                onUpdate={handleSceneUpdate}
                onDelete={handleSceneDelete}
                onReorder={handleSceneReorder}
                saveTrigger={sceneSaveTrigger}
                editTrigger={sceneEditTrigger}
              />
            )}
          </div>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <button className={styles.sectionLabel} onClick={() => toggleSection('groups')}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: sectionsCollapsed.groups ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
                Groups
              </button>
              {!sectionsCollapsed.groups && (
                <button
                  className={styles.sectionActionBtn}
                  onClick={onToggleGroupStrip}
                  title={showGroupStrip ? 'Hide group strip' : 'Show group strip'}
                >
                  {showGroupStrip ? 'Hide strip' : 'Show strip'}
                </button>
              )}
            </div>
            {!sectionsCollapsed.groups && showGroupStrip && (
              <GroupStrip
                groups={groups}
                fixtures={fixtures}
                groupStates={groupStates}
                onStateChange={handleStateChange}
                onGroupFull={(groupId) => setGroupChannels(groupId, 255)}
                onGroupMute={(groupId) => setGroupChannels(groupId, 0)}
                onSaveGroup={handleSaveGroup}
                onDeleteGroup={handleDeleteGroup}
                onReorder={handleGroupReorder}
                addTrigger={0}
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
            <button className={styles.addFixtureBtn} onClick={() => setEditingGroupId('new')}>
              + Add Group
            </button>
            <button
              className={`${styles.layoutToggleBtn}${fixturesHorizontal ? ` ${styles.layoutToggleActive}` : ''}`}
              onClick={() => setFixturesHorizontal((v) => !v)}
              title={fixturesHorizontal ? 'Wrap fixtures onto rows' : 'Scroll fixtures horizontally'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {fixturesHorizontal ? (
                  <>
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                  </>
                ) : (
                  <>
                    <path d="M4 12h16M16 8l4 4-4 4"/>
                  </>
                )}
              </svg>
            </button>
          </div>
          <div className={`${styles.fixturesSection}${fixturesHorizontal ? ` ${styles.fixturesSectionHorizontal}` : ''}`}>
            {sectionItems.length === 0 && (
              <p className={styles.empty}>No fixtures yet — click &quot;+ Add Channels&quot; to get started.</p>
            )}
            <div
              className={`${styles.fixtures}${fixturesHorizontal ? ` ${styles.fixturesHorizontal}` : ''}`}
              {...containerProps}
            >
              {sectionItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  {dragId && insertIndex === index && (
                    <div className={styles.insertIndicator} aria-hidden="true" />
                  )}
                  <div
                    className={item.id === dragId ? styles.dragging : undefined}
                    {...itemProps(item.id)}
                  >
                    {item.kind === 'group' ? (
                      <GroupCard
                        group={item.group}
                        fader={groupStates[item.group.id]?.fader ?? 100}
                        fixtures={fixtures.filter((f) => item.group.fixtureIds.includes(f.id))}
                        getChannel={getChannel}
                        onFaderChange={(fader) => handleStateChange(item.group.id, { fader })}
                        onFull={() => setGroupChannels(item.group.id, 255)}
                        onMute={() => setGroupChannels(item.group.id, 0)}
                        onEdit={() => setEditingGroupId(item.group.id)}
                        onFixtureChange={handleSetChannel}
                        onMultiFixtureChange={handleMultiFixtureChange}
                        onFixtureRename={(fixture, name) => handleFixtureRename(fixture, name)}
                        onFixtureEdit={(fixture) => setEditingFixture(fixture)}
                        onDropFixture={(fixtureId) => handleDropFixtureOnGroup(item.group.id, fixtureId)}
                      />
                    ) : item.fixture.channels ? (
                      <MultiFixtureFader
                        fixture={item.fixture}
                        values={Object.fromEntries(
                          item.fixture.channels.map((ch) => [ch.id, getChannel(ch.universe, ch.channel)])
                        )}
                        onChange={(newValues) => handleMultiFixtureChange(item.fixture, newValues)}
                        onRename={(name) => handleFixtureRename(item.fixture, name)}
                        onEdit={() => setEditingFixture(item.fixture)}
                        groupColor={getFixtureGroupColor(item.fixture.id)}
                        groupMultiplier={getFixtureGroupMultiplier(item.fixture.id)}
                      />
                    ) : (
                      <FixtureFader
                        channel={item.fixture.channel}
                        universe={item.fixture.universe}
                        name={item.fixture.name}
                        value={getChannel(item.fixture.universe, item.fixture.channel)}
                        onChange={(v) => handleSetChannel(item.fixture, v)}
                        onRename={(name) => handleFixtureRename(item.fixture, name)}
                        groupColor={getFixtureGroupColor(item.fixture.id)}
                        groupMultiplier={getFixtureGroupMultiplier(item.fixture.id)}
                      />
                    )}
                  </div>
                </React.Fragment>
              ))}
              {dragId && insertIndex === sectionItems.length && (
                <div className={styles.insertIndicator} aria-hidden="true" />
              )}
            </div>
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

      {editingGroupId !== null && (
        <Modal
          title={editingGroupId === 'new'
            ? 'New Group'
            : `Edit: ${groups.find((g) => g.id === editingGroupId)?.name ?? ''}`}
          onClose={() => setEditingGroupId(null)}
          centered
        >
          <GroupEditor
            groups={groups}
            fixtures={fixtures}
            editing={editingGroupId === 'new' ? null : groups.find((g) => g.id === editingGroupId) ?? null}
            onSave={async (group) => { await handleSaveGroup(group); setEditingGroupId(null) }}
            onDelete={async (id) => { await handleDeleteGroup(id); setEditingGroupId(null) }}
            onCancel={() => setEditingGroupId(null)}
          />
        </Modal>
      )}

      {tab === 'full' && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <button className={styles.sectionLabel} onClick={() => toggleSection('scenes')}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: sectionsCollapsed.scenes ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
                Scenes
              </button>
              {!sectionsCollapsed.scenes && (
                <div className={styles.sectionActions}>
                  {activeSceneId && (
                    <button className={styles.sectionActionBtn} onClick={() => setSceneEditTrigger((n) => n + 1)}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        <path d="m15 5 4 4"/>
                      </svg>
                      Edit Scene
                    </button>
                  )}
                  <button className={styles.sectionActionBtn} onClick={() => setSceneSaveTrigger((n) => n + 1)}>+ Save Scene</button>
                </div>
              )}
            </div>
            {!sectionsCollapsed.scenes && (
              <ScenesStrip
                scenes={scenes}
                activeSceneId={activeSceneId}
                groups={groups}
                currentGroupStates={groupStates}
                onActivate={handleActivate}
                onSave={handleSave}
                onUpdate={handleSceneUpdate}
                onDelete={handleSceneDelete}
                onReorder={handleSceneReorder}
                saveTrigger={sceneSaveTrigger}
                editTrigger={sceneEditTrigger}
              />
            )}
          </div>
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
