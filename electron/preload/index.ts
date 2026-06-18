import { contextBridge, ipcRenderer } from 'electron'
import type { Fixture, SaveSceneArgs, SetChannelArgs, DmxStatus, UpdateSceneArgs, Group, GroupChannelOverride, ShowInfo, FixtureTemplate } from '../../src/shared/types'

const api = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setPort: (port: number) => ipcRenderer.invoke('config:setPort', { port }),

  setChannel: (args: SetChannelArgs) => ipcRenderer.invoke('dmx:setChannel', args),

  saveScene: (args: SaveSceneArgs) => ipcRenderer.invoke('scene:save', args),
  loadScene: (id: string) => ipcRenderer.invoke('scene:load', { id }),
  deleteScene: (id: string) => ipcRenderer.invoke('scene:delete', { id }),
  updateScene: (args: UpdateSceneArgs) => ipcRenderer.invoke('scene:update', args),
  reorderScenes: (ids: string[]) => ipcRenderer.invoke('scene:reorder', { ids }),

  updateFixture: (fixture: Fixture) => ipcRenderer.invoke('fixture:update', fixture),
  deleteFixture: (id: string) => ipcRenderer.invoke('fixture:delete', { id }),
  saveFixtureTemplate: (template: FixtureTemplate) =>
    ipcRenderer.invoke('fixture:saveTemplate', template),
  deleteFixtureTemplate: (id: string) =>
    ipcRenderer.invoke('fixture:deleteTemplate', { id }),

  onDmxStatus: (cb: (status: DmxStatus) => void) => {
    ipcRenderer.on('dmx:status', (_e, status) => cb(status))
  },

  onDeviceAutoConnected: (cb: (path: string) => void) => {
    ipcRenderer.on('device:autoConnected', (_e, path) => cb(path))
  },

  onSceneActivated: (cb: (sceneId: string) => void) => {
    ipcRenderer.on('scene:activated', (_e, sceneId) => cb(sceneId))
  },

  setDevicePath: (path: string) => ipcRenderer.invoke('config:setDevicePath', { path }),
  setDmxOutputPort: (port: 0 | 1 | 2) => ipcRenderer.invoke('config:setDmxOutputPort', { port }),

  listPorts: () => ipcRenderer.invoke('device:listPorts'),

  saveGroup: (group: Group) => ipcRenderer.invoke('group:save', group),
  deleteGroup: (id: string) => ipcRenderer.invoke('group:delete', { id }),
  reorderGroups: (ids: string[]) => ipcRenderer.invoke('group:reorder', { ids }),
  setGroupOverrides: (map: Record<string, GroupChannelOverride>) => ipcRenderer.invoke('group:setOverrides', map),

  exportShow: () => ipcRenderer.invoke('show:export'),
  importShow: () => ipcRenderer.invoke('show:import'),

  resetShow: () => ipcRenderer.invoke('show:reset'),
  listShows: () => ipcRenderer.invoke('show:list'),
  saveNamedShow: (name: string) => ipcRenderer.invoke('show:saveNamed', { name }),
  loadNamedShow: (name: string) => ipcRenderer.invoke('show:loadNamed', { name }),
  deleteNamedShow: (name: string) => ipcRenderer.invoke('show:deleteNamed', { name }),

  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  onMenuNewShow: (cb: () => void) => { ipcRenderer.on('menu:newShow', cb) },
  onMenuSaveShow: (cb: () => void) => { ipcRenderer.on('menu:saveShow', cb) },
  onMenuOpenShows: (cb: () => void) => { ipcRenderer.on('menu:openShows', cb) },
  onMenuExportShow: (cb: () => void) => { ipcRenderer.on('menu:exportShow', cb) },
  onMenuImportShow: (cb: () => void) => { ipcRenderer.on('menu:importShow', cb) },
  onMenuViewFull: (cb: () => void) => { ipcRenderer.on('menu:viewFull', cb) },
  onMenuViewCustom: (cb: () => void) => { ipcRenderer.on('menu:viewCustom', cb) },
  onMenuAllOff: (cb: () => void) => { ipcRenderer.on('menu:allOff', cb) },
  onMenuOpenSettings: (cb: () => void) => { ipcRenderer.on('menu:openSettings', cb) },
  onMenuSaveScene: (cb: () => void) => { ipcRenderer.on('menu:saveScene', cb) },
  onMenuAddScene: (cb: () => void) => { ipcRenderer.on('menu:addScene', cb) },
  onMenuAddChannels: (cb: () => void) => { ipcRenderer.on('menu:addChannels', cb) },
  onMenuAddFixture: (cb: () => void) => { ipcRenderer.on('menu:addFixture', cb) },
  onMenuAddGroup: (cb: () => void) => { ipcRenderer.on('menu:addGroup', cb) },
}

contextBridge.exposeInMainWorld('electronAPI', api)
