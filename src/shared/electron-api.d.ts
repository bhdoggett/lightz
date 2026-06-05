import type { Fixture, Config, Scene, SaveSceneArgs, SetChannelArgs, DmxStatus, UpdateSceneArgs, Group, GroupChannelOverride, ShowInfo } from './types'

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<Config>
      setPort: (port: number) => Promise<void>
      setChannel: (args: SetChannelArgs) => Promise<void>
      saveScene: (args: SaveSceneArgs) => Promise<Scene>
      loadScene: (id: string) => Promise<void>
      deleteScene: (id: string) => Promise<void>
      updateScene: (args: UpdateSceneArgs) => Promise<Scene | null>
      reorderScenes: (ids: string[]) => Promise<void>
      updateFixture: (fixture: Fixture) => Promise<Fixture>
      deleteFixture: (id: string) => Promise<void>
      onDmxStatus: (cb: (status: DmxStatus) => void) => void
      setDevicePath: (path: string) => Promise<void>
      setDmxOutputPort: (port: 0 | 1 | 2) => Promise<void>
      listPorts: () => Promise<string[]>
      saveGroup: (group: Group) => Promise<Group[]>
      deleteGroup: (id: string) => Promise<void>
      reorderGroups: (ids: string[]) => Promise<void>
      setGroupOverrides: (map: Record<string, GroupChannelOverride>) => Promise<void>
      exportShow: () => Promise<boolean>
      importShow: () => Promise<Config | null>
      resetShow: () => Promise<Config>
      listShows: () => Promise<ShowInfo[]>
      saveNamedShow: (name: string) => Promise<ShowInfo[]>
      loadNamedShow: (name: string) => Promise<Config>
      deleteNamedShow: (name: string) => Promise<ShowInfo[]>
    }
  }
}
