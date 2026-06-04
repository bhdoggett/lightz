import type { Fixture, Config, Scene, SaveSceneArgs, SetChannelArgs, DmxStatus } from './types'

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<Config>
      setPort: (port: number) => Promise<void>
      setChannel: (args: SetChannelArgs) => Promise<void>
      saveScene: (args: SaveSceneArgs) => Promise<Scene>
      loadScene: (id: string) => Promise<void>
      deleteScene: (id: string) => Promise<void>
      updateFixture: (fixture: Fixture) => Promise<Fixture>
      deleteFixture: (id: string) => Promise<void>
      onDmxStatus: (cb: (status: DmxStatus) => void) => void
      setDevicePath: (path: string) => Promise<void>
      setDmxOutputPort: (port: 0 | 1 | 2) => Promise<void>
      listPorts: () => Promise<string[]>
      exportShow: () => Promise<boolean>
      importShow: () => Promise<Config | null>
    }
  }
}
