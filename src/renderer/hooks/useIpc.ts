import { useCallback } from 'react'
import type { Fixture, SaveSceneArgs, SetChannelArgs, UpdateSceneArgs, Group, GroupChannelOverride } from '../../shared/types'

export function useIpc() {
  const getConfig = useCallback(() => window.electronAPI.getConfig(), [])
  const setChannel = useCallback((args: SetChannelArgs) => window.electronAPI.setChannel(args), [])
  const saveScene = useCallback((args: SaveSceneArgs) => window.electronAPI.saveScene(args), [])
  const loadScene = useCallback((id: string) => window.electronAPI.loadScene(id), [])
  const deleteScene = useCallback((id: string) => window.electronAPI.deleteScene(id), [])
  const updateScene = useCallback((args: UpdateSceneArgs) => window.electronAPI.updateScene(args), [])
  const reorderScenes = useCallback((ids: string[]) => window.electronAPI.reorderScenes(ids), [])
  const updateFixture = useCallback((f: Fixture) => window.electronAPI.updateFixture(f), [])
  const deleteFixture = useCallback((id: string) => window.electronAPI.deleteFixture(id), [])
  const setPort = useCallback((port: number) => window.electronAPI.setPort(port), [])
  const saveGroup = useCallback((g: Group) => window.electronAPI.saveGroup(g), [])
  const deleteGroup = useCallback((id: string) => window.electronAPI.deleteGroup(id), [])
  const reorderGroups = useCallback((ids: string[]) => window.electronAPI.reorderGroups(ids), [])
  const setGroupOverrides = useCallback((map: Record<string, GroupChannelOverride>) => window.electronAPI.setGroupOverrides(map), [])

  return {
    getConfig, setChannel, saveScene, loadScene, deleteScene, updateScene,
    reorderScenes, updateFixture, deleteFixture, setPort,
    saveGroup, deleteGroup, reorderGroups, setGroupOverrides,
  }
}
