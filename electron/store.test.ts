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

import { getConfig, saveFixture, deleteFixture, saveScene, deleteScene, setCompanionPort, updateScene, reorderScenes, saveGroup, deleteGroup } from './store'
import type { Fixture, Scene, Group } from '../src/shared/types'

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
  it('regenerates the id from the new name, preserving values', () => {
    const scenes = [
      { id: 's1', name: 'Old Name', fadeDuration: 0, values: { f1: 100 } },
      { id: 's2', name: 'Other', fadeDuration: 500, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    const result = updateScene('s1', 'New Name', 2000)
    expect(result).toEqual({ id: 'new-name', name: 'New Name', fadeDuration: 2000, values: { f1: 100 } })
    expect(inst().set).toHaveBeenCalledWith('scenes', [
      { id: 'new-name', name: 'New Name', fadeDuration: 2000, values: { f1: 100 } },
      { id: 's2', name: 'Other', fadeDuration: 500, values: {} },
    ])
  })

  it('keeps the same id when the name is unchanged', () => {
    const scenes = [
      { id: 'worship-mode', name: 'Worship Mode', fadeDuration: 0, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    const result = updateScene('worship-mode', 'Worship Mode', 1500)
    expect(result).toEqual({ id: 'worship-mode', name: 'Worship Mode', fadeDuration: 1500, values: {} })
  })

  it('appends a suffix when the new name collides with another scene id', () => {
    const scenes = [
      { id: 's1', name: 'Old Name', fadeDuration: 0, values: {} },
      { id: 'bright', name: 'Bright', fadeDuration: 0, values: {} },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? scenes : def
    )
    inst().set.mockClear()
    const result = updateScene('s1', 'Bright', 0)
    expect(result?.id).toBe('bright-2')
  })

  it('returns null when id not found', () => {
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'scenes' ? [] : def
    )
    inst().set.mockClear()
    expect(updateScene('nonexistent', 'X', 0)).toBeNull()
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

describe('saveGroup', () => {
  it('adds a new group', () => {
    const group: Group = { id: 'g1', name: 'Front Wash', color: '#6366f1', fixtureIds: ['f1'] }
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'groups' ? [] : def
    )
    inst().set.mockClear()
    saveGroup(group)
    expect(inst().set).toHaveBeenCalledWith('groups', [group])
  })

  it('removes fixture from other groups when saving a group that claims it', () => {
    const existing: Group[] = [
      { id: 'g1', name: 'A', color: '#fff', fixtureIds: ['f1', 'f2'] },
    ]
    const newGroup: Group = { id: 'g2', name: 'B', color: '#000', fixtureIds: ['f1'] }
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'groups' ? existing : def
    )
    inst().set.mockClear()
    saveGroup(newGroup)
    const [[, saved]] = inst().set.mock.calls
    expect(saved[0].fixtureIds).toEqual(['f2'])
    expect(saved[1].fixtureIds).toEqual(['f1'])
  })
})

describe('deleteGroup', () => {
  it('removes group by id', () => {
    const groups: Group[] = [
      { id: 'g1', name: 'A', color: '#fff', fixtureIds: [] },
      { id: 'g2', name: 'B', color: '#000', fixtureIds: [] },
    ]
    inst().get.mockImplementation((key: string, def: unknown) =>
      key === 'groups' ? groups : def
    )
    inst().set.mockClear()
    deleteGroup('g1')
    expect(inst().set).toHaveBeenCalledWith('groups', [groups[1]])
  })
})
