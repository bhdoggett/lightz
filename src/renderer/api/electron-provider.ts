import type { LightzApi } from './types'

export const electronApi: LightzApi = {
  getConfig: () => window.electronAPI.getConfig(),
  setPort: (port) => window.electronAPI.setPort(port),
  setDevicePath: (path) => window.electronAPI.setDevicePath(path),
  setDmxOutputPort: (port) => window.electronAPI.setDmxOutputPort(port),

  setChannel: (args) => window.electronAPI.setChannel(args),

  saveScene: (args) => window.electronAPI.saveScene(args),
  loadScene: (id) => window.electronAPI.loadScene(id),
  deleteScene: (id) => window.electronAPI.deleteScene(id),
  updateScene: (args) => window.electronAPI.updateScene(args),
  reorderScenes: (ids) => window.electronAPI.reorderScenes(ids),

  updateFixture: (f) => window.electronAPI.updateFixture(f),
  deleteFixture: (id) => window.electronAPI.deleteFixture(id),
  saveFixtureTemplate: (t) => window.electronAPI.saveFixtureTemplate(t),
  deleteFixtureTemplate: (id) => window.electronAPI.deleteFixtureTemplate(id),

  saveGroup: (g) => window.electronAPI.saveGroup(g),
  deleteGroup: (id) => window.electronAPI.deleteGroup(id),
  reorderGroups: (ids) => window.electronAPI.reorderGroups(ids),
  reorderFixtureSection: (ids) => window.electronAPI.reorderFixtureSection(ids),
  setShowGroupStrip: (show) => window.electronAPI.setShowGroupStrip(show),
  setGroupOverrides: (map) => window.electronAPI.setGroupOverrides(map),

  resetShow: () => window.electronAPI.resetShow(),
  listShows: () => window.electronAPI.listShows(),
  saveNamedShow: (name) => window.electronAPI.saveNamedShow(name),
  loadNamedShow: (name) => window.electronAPI.loadNamedShow(name),
  deleteNamedShow: (name) => window.electronAPI.deleteNamedShow(name),
  exportShow: () => window.electronAPI.exportShow().then(() => {}),
  importShow: () => window.electronAPI.importShow(),

  listPorts: () => window.electronAPI.listPorts(),
  openExternal: (url) => window.electronAPI.openExternal(url),

  onDmxStatus: (cb) => window.electronAPI.onDmxStatus(cb),
  onDeviceAutoConnected: (cb) => window.electronAPI.onDeviceAutoConnected(cb),
  onSceneActivated: (cb) => window.electronAPI.onSceneActivated(cb),
  onMenuNewShow: (cb) => window.electronAPI.onMenuNewShow(cb),
  onMenuSaveShow: (cb) => window.electronAPI.onMenuSaveShow(cb),
  onMenuOpenShows: (cb) => window.electronAPI.onMenuOpenShows(cb),
  onMenuExportShow: (cb) => window.electronAPI.onMenuExportShow(cb),
  onMenuImportShow: (cb) => window.electronAPI.onMenuImportShow(cb),
  onMenuViewFull: (cb) => window.electronAPI.onMenuViewFull(cb),
  onMenuViewCustom: (cb) => window.electronAPI.onMenuViewCustom(cb),
  onMenuAllOff: (cb) => window.electronAPI.onMenuAllOff(cb),
  onMenuOpenSettings: (cb) => window.electronAPI.onMenuOpenSettings(cb),
  onMenuSaveScene: (cb) => window.electronAPI.onMenuSaveScene(cb),
  onMenuAddScene: (cb) => window.electronAPI.onMenuAddScene(cb),
  onMenuAddChannels: (cb) => window.electronAPI.onMenuAddChannels(cb),
  onMenuAddFixture: (cb) => window.electronAPI.onMenuAddFixture(cb),
  onMenuAddGroup: (cb) => window.electronAPI.onMenuAddGroup(cb),
}
