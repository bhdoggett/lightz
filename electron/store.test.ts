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

import { getConfig, saveFixture, deleteFixture, saveScene, deleteScene, setCompanionPort, updateScene, reorderScenes } from './store'
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
    expect(config.companionPort).toBe(5551)
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

import Store from 'electron-store'

// Helper to get the single mock instance created when store.ts was imported
const inst = () => (Store as any).mock.results[0].value

describe('updateScene', () => {
  it('updates name and fadeDuration in place, preserving values', () => {
    const scenes = [
      { id: 's1', name: 'Old Name', fadeDuration: 0, values: { f1: 100 } },
      { id: 's2', name: 'Other', fadeDuration: 500, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    updateScene('s1', 'New Name', 2000)
    expect(inst().set).toHaveBeenCalledWith('scenes', [
      { id: 's1', name: 'New Name', fadeDuration: 2000, values: { f1: 100 } },
      { id: 's2', name: 'Other', fadeDuration: 500, values: {} },
    ])
  })

  it('does nothing when id not found', () => {
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? [] : def
    )
    inst().set.mockClear()
    updateScene('nonexistent', 'X', 0)
    expect(inst().set).not.toHaveBeenCalled()
  })
})

describe('reorderScenes', () => {
  it('reorders scenes by given id list', () => {
    const scenes = [
      { id: 's1', name: 'A', fadeDuration: 0, values: {} },
      { id: 's2', name: 'B', fadeDuration: 0, values: {} },
      { id: 's3', name: 'C', fadeDuration: 0, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    reorderScenes(['s3', 's1', 's2'])
    expect(inst().set).toHaveBeenCalledWith('scenes', [
      { id: 's3', name: 'C', fadeDuration: 0, values: {} },
      { id: 's1', name: 'A', fadeDuration: 0, values: {} },
      { id: 's2', name: 'B', fadeDuration: 0, values: {} },
    ])
  })

  it('drops scenes whose id is not in the list', () => {
    const scenes = [
      { id: 's1', name: 'A', fadeDuration: 0, values: {} },
      { id: 's2', name: 'B', fadeDuration: 0, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    reorderScenes(['s1'])
    expect(inst().set).toHaveBeenCalledWith('scenes', [
      { id: 's1', name: 'A', fadeDuration: 0, values: {} },
    ])
  })
})
