import type {
  Config, Scene, Fixture, Group, SaveSceneArgs, SetChannelArgs,
  UpdateSceneArgs, GroupChannelOverride, ShowInfo, FixtureTemplate, DmxStatus,
} from '../../shared/types'

export interface LightzApi {
  // Config
  getConfig(): Promise<Config>
  setPort(port: number): Promise<void>
  setDevicePath(path: string): Promise<void>
  setDmxOutputPort(port: 0 | 1 | 2): Promise<void>

  // DMX
  setChannel(args: SetChannelArgs): Promise<void>

  // Scenes
  saveScene(args: SaveSceneArgs): Promise<Scene>
  loadScene(id: string): Promise<void>
  deleteScene(id: string): Promise<void>
  updateScene(args: UpdateSceneArgs): Promise<Scene | null>
  reorderScenes(ids: string[]): Promise<void>

  // Fixtures
  updateFixture(fixture: Fixture): Promise<Fixture>
  deleteFixture(id: string): Promise<void>
  saveFixtureTemplate(template: FixtureTemplate): Promise<FixtureTemplate[]>
  deleteFixtureTemplate(id: string): Promise<FixtureTemplate[]>

  // Groups
  saveGroup(group: Group): Promise<Group[]>
  deleteGroup(id: string): Promise<void>
  reorderGroups(ids: string[]): Promise<void>
  reorderFixtureSection(ids: string[]): Promise<void>
  setShowGroupStrip(show: boolean): Promise<void>
  setGroupOverrides(map: Record<string, GroupChannelOverride>): Promise<void>

  // Shows
  resetShow(): Promise<Config>
  listShows(): Promise<ShowInfo[]>
  saveNamedShow(name: string): Promise<ShowInfo[]>
  loadNamedShow(name: string): Promise<Config>
  deleteNamedShow(name: string): Promise<ShowInfo[]>
  exportShow(): Promise<void>
  importShow(): Promise<Config | null>

  // Platform
  listPorts(): Promise<string[]>
  openExternal(url: string): Promise<void>

  // Event listeners
  onDmxStatus(cb: (status: DmxStatus) => void): void
  onDeviceAutoConnected(cb: (path: string) => void): void
  onSceneActivated(cb: (sceneId: string) => void): void
  onMenuNewShow(cb: () => void): void
  onMenuSaveShow(cb: () => void): void
  onMenuOpenShows(cb: () => void): void
  onMenuExportShow(cb: () => void): void
  onMenuImportShow(cb: () => void): void
  onMenuViewFull(cb: () => void): void
  onMenuViewCustom(cb: () => void): void
  onMenuAllOff(cb: () => void): void
  onMenuOpenSettings(cb: () => void): void
  onMenuSaveScene(cb: () => void): void
  onMenuAddScene(cb: () => void): void
  onMenuAddChannels(cb: () => void): void
  onMenuAddFixture(cb: () => void): void
  onMenuAddGroup(cb: () => void): void
}
