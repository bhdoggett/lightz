import { ipcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import { makeSceneId } from './slug'
import { getConfig, saveFixture, deleteFixture, saveScene, deleteScene, setCompanionPort, setDevicePath, setDmxOutputPort, replaceConfig } from './store'
import { exportShow, importShow } from './show'
import { listSerialPorts } from './ports'
import type { DmxManager } from './dmx'
import type { Fixture, SaveSceneArgs, SetChannelArgs } from '../src/shared/types'

export function registerIpcHandlers(dmxManager: DmxManager, onReconnect: (path: string) => void): void {
  ipcMain.handle('config:get', () => getConfig())

  ipcMain.handle('config:setPort', (_e, { port }: { port: number }) => {
    setCompanionPort(port)
  })

  ipcMain.handle('config:setDevicePath', (_e, { path }: { path: string }) => {
    setDevicePath(path)
    onReconnect(path)
  })

  ipcMain.handle('config:setDmxOutputPort', (_e, { port }: { port: 0 | 1 | 2 }) => {
    setDmxOutputPort(port)
    onReconnect(getConfig().devicePath)
  })

  ipcMain.handle('dmx:setChannel', (_e, args: SetChannelArgs) => {
    dmxManager.setChannel(args.universe, args.channel, args.value)
  })

  ipcMain.handle('scene:save', (_e, args: SaveSceneArgs) => {
    const config = getConfig()
    const existingIds = config.scenes.map((s) => s.id)
    const id = makeSceneId(args.name, existingIds)
    const scene = { id, name: args.name, fadeDuration: args.fadeDuration, values: args.values }
    saveScene(scene)
    return scene
  })

  ipcMain.handle('scene:load', (_e, { id }: { id: string }) => {
    const config = getConfig()
    const scene = config.scenes.find((s) => s.id === id)
    if (!scene) return
    dmxManager.activateScene(
      scene.values,
      config.fixtures,
      scene.fadeDuration,
      (fid) => config.fixtures.find((f) => f.id === fid)
    )
  })

  ipcMain.handle('scene:delete', (_e, { id }: { id: string }) => {
    deleteScene(id)
  })

  ipcMain.handle('fixture:update', (_e, fixture: Fixture) => {
    if (!fixture.id) fixture = { ...fixture, id: uuid() }
    saveFixture(fixture)
    return fixture
  })

  ipcMain.handle('fixture:delete', (_e, { id }: { id: string }) => {
    deleteFixture(id)
  })

  ipcMain.handle('show:export', async () => {
    return exportShow(getConfig())
  })

  ipcMain.handle('show:import', async () => {
    const config = await importShow()
    if (!config) return null
    replaceConfig(config)
    return config
  })

  ipcMain.handle('device:listPorts', () => listSerialPorts())
}
