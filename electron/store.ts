import Store from 'electron-store'
import type { Config, Fixture, Scene } from '../src/shared/types'

const store = new Store<Config>({
  defaults: {
    fixtures: [],
    scenes: [],
    companionPort: 3000,
  },
})

export function getConfig(): Config {
  return {
    fixtures: store.get('fixtures', []),
    scenes: store.get('scenes', []),
    companionPort: store.get('companionPort', 3000),
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

export function setCompanionPort(port: number): void {
  store.set('companionPort', port)
}
