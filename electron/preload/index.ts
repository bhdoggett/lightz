import { contextBridge, ipcRenderer } from 'electron'
import type { Fixture, SaveSceneArgs, SetChannelArgs, DmxStatus, UpdateSceneArgs, Group, GroupChannelOverride, ShowInfo } from '../../src/shared/types'

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

  onDmxStatus: (cb: (status: DmxStatus) => void) => {
    ipcRenderer.on('dmx:status', (_e, status) => cb(status))
  },

  setDevicePath: (path: string) => ipcRenderer.invoke('config:setDevicePath', { path }),
  setDmxOutputPort: (port: 0 | 1 | 2) => ipcRenderer.invoke('config:setDmxOutputPort', { port }),

  listPorts: () => ipcRenderer.invoke('device:listPorts'),

  saveGroup: (group: Group) => ipcRenderer.invoke('group:save', group),
  deleteGroup: (id: string) => ipcRenderer.invoke('group:delete', { id }),
  setGroupOverrides: (map: Record<string, GroupChannelOverride>) => ipcRenderer.invoke('group:setOverrides', map),

  exportShow: () => ipcRenderer.invoke('show:export'),
  importShow: () => ipcRenderer.invoke('show:import'),

  listShows: () => ipcRenderer.invoke('show:list'),
  saveNamedShow: (name: string) => ipcRenderer.invoke('show:saveNamed', { name }),
  loadNamedShow: (name: string) => ipcRenderer.invoke('show:loadNamed', { name }),
  deleteNamedShow: (name: string) => ipcRenderer.invoke('show:deleteNamed', { name }),
}

contextBridge.exposeInMainWorld('electronAPI', api)
