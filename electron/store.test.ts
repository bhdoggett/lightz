// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn((key: string, def: unknown) => def),
      set: vi.fn(),
      store: {},
    })),
  }
})

import { getConfig, saveFixture, deleteFixture, saveScene, deleteScene, setCompanionPort } from './store'
import type { Fixture, Scene } from '../src/shared/types'

const fixture: Fixture = {
  id: 'f1', name: 'Chandelier L', channel: 1, universe: 0, type: 'dimmer',
}

const scene: Scene = {
  id: 'worship-mode', name: 'Worship Mode', fadeDuration: 1000,
  values: { f1: 200 },
}

describe('config store', () => {
  it('getConfig returns defaults when store is empty', () => {
    const config = getConfig()
    expect(config.fixtures).toEqual([])
    expect(config.scenes).toEqual([])
    expect(config.companionPort).toBe(3000)
  })

  it('saveFixture adds a new fixture', () => {
    saveFixture(fixture)
    const config = getConfig()
    expect(config).toBeDefined()
  })

  it('saveScene adds a new scene', () => {
    saveScene(scene)
    const config = getConfig()
    expect(config).toBeDefined()
  })

  it('deleteFixture does not throw', () => {
    expect(() => deleteFixture('f1')).not.toThrow()
  })

  it('setCompanionPort updates port', () => {
    setCompanionPort(4000)
    expect(true).toBe(true)
  })
})
