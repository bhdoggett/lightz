import Store from 'electron-store'
import type { Config, Fixture, Scene, Group, FixtureTemplate, GroupState } from '../src/shared/types'
import { makeSceneId } from './slug'

const store = new Store<Config>({
  defaults: {
    fixtures: [],
    scenes: [],
    groups: [],
    fixtureTemplates: [],
    companionPort: 5551,
    devicePath: '',
    dmxOutputPort: 0,
  },
})

// Migrate old default port 3000 → 5551
if (store.get('companionPort', 5551) === 3000) {
  store.set('companionPort', 5551)
}

export function getConfig(): Config {
  return {
    fixtures: store.get('fixtures', []),
    scenes: store.get('scenes', []),
    groups: store.get('groups', []),
    fixtureTemplates: store.get('fixtureTemplates', []),
    companionPort: store.get('companionPort', 5551),
    devicePath: store.get('devicePath', ''),
    dmxOutputPort: store.get('dmxOutputPort', 0),
    fixtureSectionOrder: store.get('fixtureSectionOrder' as any, undefined),
    showGroupStrip: store.get('showGroupStrip' as any, undefined),
  }
}

export function saveFixture(fixture: Fixture): void {
  const fixtures = store.get('fixtures', [])
  const idx = fixtures.findIndex((f) => f.id === fixture.id)
  if (idx >= 0) {
    fixtures[idx] = fixture
  } else {
    fixtures.push(fixture)
  }
  store.set('fixtures', fixtures)
}

export function deleteFixture(id: string): void {
  const fixtures = store.get('fixtures', []).filter((f) => f.id !== id)
  store.set('fixtures', fixtures)
}

export function saveScene(scene: Scene): void {
  const scenes = store.get('scenes', [])
  const idx = scenes.findIndex((s) => s.id === scene.id)
  if (idx >= 0) {
    scenes[idx] = scene
  } else {
    scenes.push(scene)
  }
  store.set('scenes', scenes)
}

export function deleteScene(id: string): void {
  const scenes = store.get('scenes', []).filter((s) => s.id !== id)
  store.set('scenes', scenes)
}

export function saveGroup(group: Group): void {
  // Enforce one fixture per group: remove this group's fixtures from any other group
  let groups = store.get('groups', [])
  groups = groups.map((g) =>
    g.id === group.id
      ? group
      : { ...g, fixtureIds: g.fixtureIds.filter((fid) => !group.fixtureIds.includes(fid)) }
  )
  if (!groups.find((g) => g.id === group.id)) groups.push(group)
  store.set('groups', groups)
}

export function deleteGroup(id: string): void {
  store.set('groups', store.get('groups', []).filter((g) => g.id !== id))
}

export function saveFixtureTemplate(template: FixtureTemplate): FixtureTemplate[] {
  const templates = store.get('fixtureTemplates', [])
  const idx = templates.findIndex((t) => t.id === template.id)
  if (idx >= 0) {
    templates[idx] = template
  } else {
    templates.push(template)
  }
  store.set('fixtureTemplates', templates)
  return templates
}

export function deleteFixtureTemplate(id: string): FixtureTemplate[] {
  const templates = store.get('fixtureTemplates', []).filter((t) => t.id !== id)
  store.set('fixtureTemplates', templates)
  return templates
}

export function updateScene(id: string, name: string, fadeDuration: number, values?: Record<string, number>, groupStates?: Record<string, GroupState>): Scene | null {
  const scenes = store.get('scenes', [])
  const idx = scenes.findIndex((s) => s.id === id)
  if (idx < 0) return null
  const otherIds = scenes.filter((s) => s.id !== id).map((s) => s.id)
  const newId = makeSceneId(name, otherIds)
  scenes[idx] = {
    ...scenes[idx],
    id: newId,
    name,
    fadeDuration,
    ...(values !== undefined && { values }),
    ...(groupStates !== undefined && { groupStates }),
  }
  store.set('scenes', scenes)
  return scenes[idx]
}

export function reorderGroups(ids: string[]): void {
  const groups = store.get('groups', [])
  const ordered = ids.map((id) => groups.find((g) => g.id === id)).filter((g): g is Group => g !== undefined)
  store.set('groups', ordered)
}

export function saveFixtureSectionOrder(ids: string[]): void {
  store.set('fixtureSectionOrder' as any, ids)
}

export function saveShowGroupStrip(show: boolean): void {
  store.set('showGroupStrip' as any, show)
}

export function reorderScenes(ids: string[]): void {
  const scenes = store.get('scenes', [])
  const ordered = ids.map((id) => scenes.find((s) => s.id === id)).filter((s): s is Scene => s !== undefined)
  store.set('scenes', ordered)
}

export function setCompanionPort(port: number): void {
  store.set('companionPort', port)
}

export function setDevicePath(path: string): void {
  store.set('devicePath', path)
}

export function setDmxOutputPort(port: 0 | 1 | 2): void {
  store.set('dmxOutputPort', port)
}

export function replaceConfig(config: Config): void {
  store.set('fixtures', config.fixtures)
  store.set('scenes', config.scenes)
  store.set('groups', config.groups ?? [])
  store.set('fixtureTemplates', config.fixtureTemplates ?? [])
  store.set('companionPort', config.companionPort)
  store.set('devicePath', config.devicePath ?? '')
  store.set('dmxOutputPort', config.dmxOutputPort ?? 0)
  if (config.fixtureSectionOrder !== undefined) {
    store.set('fixtureSectionOrder' as any, config.fixtureSectionOrder)
  }
  if (config.showGroupStrip !== undefined) {
    store.set('showGroupStrip' as any, config.showGroupStrip)
  }
}
