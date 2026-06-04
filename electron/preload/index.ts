import { contextBridge, ipcRenderer } from 'electron'
import type { Fixture, SaveSceneArgs, SetChannelArgs, DmxStatus } from '../../src/shared/types'

const api = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setPort: (port: number) => ipcRenderer.invoke('config:setPort', { port }),

  setChannel: (args: SetChannelArgs) => ipcRenderer.invoke('dmx:setChannel', args),

  saveScene: (args: SaveSceneArgs) => ipcRenderer.invoke('scene:save', args),
  loadScene: (id: string) => ipcRenderer.invoke('scene:load', { id }),
  deleteScene: (id: string) => ipcRenderer.invoke('scene:delete', { id }),

  updateFixture: (fixture: Fixture) => ipcRenderer.invoke('fixture:update', fixture),
  deleteFixture: (id: string) => ipcRenderer.invoke('fixture:delete', { id }),

  onDmxStatus: (cb: (status: DmxStatus) => void) => {
    ipcRenderer.on('dmx:status', (_e, status) => cb(status))
  },

  setDevicePath: (path: string) => ipcRenderer.invoke('config:setDevicePath', { path }),
  setDmxOutputPort: (port: 0 | 1 | 2) => ipcRenderer.invoke('config:setDmxOutputPort', { port }),

  listPorts: () => ipcRenderer.invoke('device:listPorts'),

  exportShow: () => ipcRenderer.invoke('show:export'),
  importShow: () => ipcRenderer.invoke('show:import'),
}

contextBridge.exposeInMainWorld('electronAPI', api)
