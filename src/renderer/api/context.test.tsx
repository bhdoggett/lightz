import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useApi, ApiProvider } from './context'
import type { LightzApi } from './types'
import type { ReactNode } from 'react'

function makeMockApi(): LightzApi {
  return {
    getConfig: async () => ({
      fixtures: [], scenes: [], groups: [], fixtureTemplates: [],
      companionPort: 5551, devicePath: '', dmxOutputPort: 0,
    }),
    setChannel: async () => {},
    saveScene: async (args) => ({ id: 'test', name: args.name, fadeDuration: args.fadeDuration, values: args.values }),
    loadScene: async () => {},
    deleteScene: async () => {},
    updateScene: async () => null,
    reorderScenes: async () => {},
    updateFixture: async (f) => f,
    deleteFixture: async () => {},
    saveFixtureTemplate: async () => [],
    deleteFixtureTemplate: async () => [],
    saveGroup: async () => [],
    deleteGroup: async () => {},
    reorderGroups: async () => {},
    setGroupOverrides: async () => {},
    resetShow: async () => ({
      fixtures: [], scenes: [], groups: [], fixtureTemplates: [],
      companionPort: 5551, devicePath: '', dmxOutputPort: 0,
    }),
    listShows: async () => [],
    saveNamedShow: async () => [],
    loadNamedShow: async () => ({
      fixtures: [], scenes: [], groups: [], fixtureTemplates: [],
      companionPort: 5551, devicePath: '', dmxOutputPort: 0,
    }),
    deleteNamedShow: async () => [],
    exportShow: async () => {},
    importShow: async () => null,
    setPort: async () => {},
    setDevicePath: async () => {},
    setDmxOutputPort: async () => {},
    listPorts: async () => [],
    openExternal: async () => {},
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

describe('useApi', () => {
  it('returns the api from context', () => {
    const mock = makeMockApi()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiProvider api={mock}>{children}</ApiProvider>
    )
    const { result } = renderHook(() => useApi(), { wrapper })
    expect(result.current).toBe(mock)
  })

  it('throws when used outside ApiProvider', () => {
    expect(() => {
      renderHook(() => useApi())
    }).toThrow()
  })
})
