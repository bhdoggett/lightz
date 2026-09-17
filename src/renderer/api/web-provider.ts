import type { LightzApi } from './types'
import type { Config, Scene, Fixture, Group, FixtureTemplate, GroupChannelOverride, ShowInfo } from '../../shared/types'
import { interpolate, clampValue } from '../../shared/dmx-utils'
import { makeSceneId, sceneNameTaken } from '../../shared/slug'
import { demoConfig } from './demo-config'

const SHOWS_KEY = 'lightz-shows'
const DELETED_SHOWS_KEY = 'lightz-deleted-shows'
const DEMO_SHOW_NAME = 'Demo'
const DELETED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

function getStoredShows(): Record<string, { config: Config; modifiedAt: number }> {
  try {
    return JSON.parse(localStorage.getItem(SHOWS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveStoredShows(shows: Record<string, { config: Config; modifiedAt: number }>): void {
  localStorage.setItem(SHOWS_KEY, JSON.stringify(shows))
}

function getDeletedShows(): Record<string, { config: Config; deletedAt: number }> {
  try {
    return JSON.parse(localStorage.getItem(DELETED_SHOWS_KEY) || '{}')
  } catch {
    return {}
  }
}

function archiveDeletedShow(name: string, config: Config): void {
  const deleted = getDeletedShows()
  const now = Date.now()
  for (const [key, entry] of Object.entries(deleted)) {
    if (now - entry.deletedAt > DELETED_RETENTION_MS) delete deleted[key]
  }
  deleted[name in deleted ? `${name}-${now}` : name] = { config, deletedAt: now }
  localStorage.setItem(DELETED_SHOWS_KEY, JSON.stringify(deleted))
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function listStoredShows(): ShowInfo[] {
  const shows = getStoredShows()
  const list: ShowInfo[] = [{ name: DEMO_SHOW_NAME, modifiedAt: 0 }]
  for (const [name, data] of Object.entries(shows)) {
    list.push({ name, modifiedAt: data.modifiedAt })
  }
  return list.sort((a, b) => b.modifiedAt - a.modifiedAt)
}

interface WebApiCallbacks {
  setChannel: (universe: 0 | 1, channel: number, value: number) => void
  getChannelValue: (universe: 0 | 1, channel: number) => number
}

export function createWebApi(callbacks: WebApiCallbacks): LightzApi {
  let config: Config = structuredClone(demoConfig)
  let fadeInterval: ReturnType<typeof setInterval> | null = null

  function resolveChannel(id: string): { channel: number; universe: 0 | 1; type: string } | undefined {
    const f = config.fixtures.find((f) => f.id === id)
    if (f && !f.channels) return { channel: f.channel, universe: f.universe, type: f.type }
    for (const fixture of config.fixtures) {
      if (!fixture.channels) continue
      const ch = fixture.channels.find((c) => c.id === id)
      if (ch) return { channel: ch.channel, universe: ch.universe, type: 'dimmer' }
    }
    return undefined
  }

  return {
    getConfig: async () => structuredClone(config),
    setPort: async () => {},
    setDevicePath: async () => {},
    setDmxOutputPort: async () => {},

    setChannel: async (args) => {
      callbacks.setChannel(args.universe, args.channel, clampValue(args.value))
    },

    saveScene: async (args) => {
      if (sceneNameTaken(args.name, config.scenes)) return null
      const scene: Scene = {
        id: makeSceneId(args.name), name: args.name, fadeDuration: args.fadeDuration, values: args.values,
        ...(args.groupStates !== undefined && { groupStates: args.groupStates }),
      }
      config.scenes.push(scene)
      return structuredClone(scene)
    },

    loadScene: async (id) => {
      const scene = config.scenes.find((s) => s.id === id)
      if (!scene) return

      if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null }

      const targets: Record<string, { universe: 0 | 1; channel: number; value: number }> = {}
      for (const [fixtureId, value] of Object.entries(scene.values)) {
        const resolved = resolveChannel(fixtureId)
        if (!resolved) continue
        if (resolved.type === 'switch') {
          callbacks.setChannel(resolved.universe, resolved.channel, clampValue(value))
        } else {
          targets[`${resolved.universe}-${resolved.channel}`] = {
            universe: resolved.universe, channel: resolved.channel, value,
          }
        }
      }

      if (scene.fadeDuration <= 0) {
        for (const t of Object.values(targets)) {
          callbacks.setChannel(t.universe, t.channel, clampValue(t.value))
        }
        return
      }

      const startValues: Record<string, number> = {}
      for (const [key, t] of Object.entries(targets)) {
        startValues[key] = callbacks.getChannelValue(t.universe, t.channel)
      }
      const startTime = Date.now()

      fadeInterval = setInterval(() => {
        const progress = Math.min((Date.now() - startTime) / scene.fadeDuration, 1)
        for (const [key, t] of Object.entries(targets)) {
          const value = interpolate(startValues[key] ?? 0, t.value, progress)
          callbacks.setChannel(t.universe, t.channel, clampValue(value))
        }
        if (progress >= 1 && fadeInterval) {
          clearInterval(fadeInterval)
          fadeInterval = null
        }
      }, 16)
    },

    deleteScene: async (id) => {
      config.scenes = config.scenes.filter((s) => s.id !== id)
    },

    updateScene: async (args) => {
      const idx = config.scenes.findIndex((s) => s.id === args.id)
      if (idx < 0) return null
      const isRename = args.name !== config.scenes[idx].name
      if (isRename) {
        const otherScenes = config.scenes.filter((s) => s.id !== args.id)
        if (sceneNameTaken(args.name, otherScenes)) return null
      }
      config.scenes[idx] = {
        ...config.scenes[idx],
        id: isRename ? makeSceneId(args.name) : config.scenes[idx].id, name: args.name, fadeDuration: args.fadeDuration,
        ...(args.values !== undefined && { values: args.values }),
        ...(args.groupStates !== undefined && { groupStates: args.groupStates }),
      }
      return structuredClone(config.scenes[idx])
    },

    reorderScenes: async (ids) => {
      config.scenes = ids
        .map((id) => config.scenes.find((s) => s.id === id))
        .filter((s): s is Scene => s !== undefined)
    },

    updateFixture: async (fixture) => {
      if (!fixture.id) fixture = { ...fixture, id: crypto.randomUUID() }
      const idx = config.fixtures.findIndex((f) => f.id === fixture.id)
      if (idx >= 0) config.fixtures[idx] = fixture
      else config.fixtures.push(fixture)
      return structuredClone(fixture)
    },

    deleteFixture: async (id) => {
      config.fixtures = config.fixtures.filter((f) => f.id !== id)
    },

    saveFixtureTemplate: async (template) => {
      const idx = config.fixtureTemplates.findIndex((t) => t.id === template.id)
      if (idx >= 0) config.fixtureTemplates[idx] = template
      else config.fixtureTemplates.push(template)
      return structuredClone(config.fixtureTemplates)
    },

    deleteFixtureTemplate: async (id) => {
      config.fixtureTemplates = config.fixtureTemplates.filter((t) => t.id !== id)
      return structuredClone(config.fixtureTemplates)
    },

    saveGroup: async (group) => {
      config.groups = config.groups.map((g) =>
        g.id === group.id
          ? group
          : { ...g, fixtureIds: g.fixtureIds.filter((fid) => !group.fixtureIds.includes(fid)) }
      )
      if (!config.groups.find((g) => g.id === group.id)) config.groups.push(group)
      return structuredClone(config.groups)
    },

    deleteGroup: async (id) => {
      config.groups = config.groups.filter((g) => g.id !== id)
    },

    reorderGroups: async (ids) => {
      config.groups = ids
        .map((id) => config.groups.find((g) => g.id === id))
        .filter((g): g is Group => g !== undefined)
    },

    reorderFixtureSection: async (ids) => {
      config.fixtureSectionOrder = ids
    },
    setShowGroupStrip: async (show) => {
      config.showGroupStrip = show
    },

    setGroupOverrides: async () => {},

    activateShow: async (incoming) => {
      config = structuredClone(incoming)
    },

    resetShow: async () => {
      config = structuredClone(demoConfig)
      return structuredClone(config)
    },

    listShows: async () => listStoredShows(),

    saveNamedShow: async (name) => {
      if (name === DEMO_SHOW_NAME) return listStoredShows()
      const shows = getStoredShows()
      shows[name] = { config: structuredClone(config), modifiedAt: Date.now() }
      saveStoredShows(shows)
      return listStoredShows()
    },

    loadNamedShow: async (name) => {
      if (name === DEMO_SHOW_NAME) {
        config = structuredClone(demoConfig)
        return structuredClone(config)
      }
      const shows = getStoredShows()
      const show = shows[name]
      if (!show) return structuredClone(config)
      config = structuredClone(show.config)
      return structuredClone(config)
    },

    deleteNamedShow: async (name) => {
      if (name === DEMO_SHOW_NAME) return listStoredShows()
      const shows = getStoredShows()
      const show = shows[name]
      if (show) archiveDeletedShow(name, show.config)
      delete shows[name]
      saveStoredShows(shows)
      return listStoredShows()
    },

    exportShow: async () => {
      downloadJson(config, 'lightz-show.json')
    },

    exportNamedShow: async (name) => {
      const show = getStoredShows()[name]
      downloadJson(name === DEMO_SHOW_NAME ? demoConfig : show?.config ?? config, `${name}.json`)
    },

    importShow: async () => null,

    listPorts: async () => [],
    openExternal: async (url) => { window.open(url, '_blank') },

    onDmxStatus: () => {},
    onDeviceAutoConnected: () => {},
    onSceneActivated: () => {},
    onMenuNewShow: () => {},
    onMenuSaveShow: () => {},
    onMenuOpenShows: () => {},
    onMenuExportShow: () => {},
    onMenuImportShow: () => {},
    onMenuViewFull: () => {},
    onMenuViewCustom: () => {},
    onMenuAllOff: () => {},
    onMenuOpenSettings: () => {},
    onMenuSaveScene: () => {},
    onMenuAddScene: () => {},
    onMenuAddChannels: () => {},
    onMenuAddFixture: () => {},
    onMenuAddGroup: () => {},
  }
}
