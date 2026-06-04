import Store from 'electron-store'
import type { Config, Fixture, Scene } from '../src/shared/types'

const store = new Store<Config>({
  defaults: {
    fixtures: [],
    scenes: [],
    companionPort: 3000,
    devicePath: '',
    dmxOutputPort: 0,
  },
})

export function getConfig(): Config {
  return {
    fixtures: store.get('fixtures', []),
    scenes: store.get('scenes', []),
    companionPort: store.get('companionPort', 3000),
    devicePath: store.get('devicePath', ''),
    dmxOutputPort: store.get('dmxOutputPort', 0),
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

export function updateScene(id: string, name: string, fadeDuration: number): void {
  const scenes = store.get('scenes', [])
  const idx = scenes.findIndex((s) => s.id === id)
  if (idx < 0) return
  scenes[idx] = { ...scenes[idx], name, fadeDuration }
  store.set('scenes', scenes)
}

export function reorderScenes(ids: string[]): void {
  const scenes = store.get('scenes', [])
  const ordered = ids.map((id) => scenes.find((s) => s.id === id)).filter(Boolean) as Scene[]
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
  store.set('companionPort', config.companionPort)
  store.set('devicePath', config.devicePath ?? '')
  store.set('dmxOutputPort', config.dmxOutputPort ?? 0)
}
