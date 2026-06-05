import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, renameSync } from 'fs'
import { DmxManager } from '../dmx'
import { createCompanionServer } from '../server'
import { registerIpcHandlers } from '../ipc'
import { getConfig } from '../store'
import { migrateShowsFolder } from '../shows-library'

// Suppress unhandled serial port errors so Electron's JS error dialog never fires.
process.on('uncaughtException', (err) => {
  console.error('[main] uncaught exception (suppressed from dialog):', err.message)
})

// Migrate electron-store userData from "Church Lights" → "Lightz"
// Must run before app is ready so the store picks up the new path
;(() => {
  const oldPath = join(app.getPath('appData'), 'Church Lights')
  const newPath = join(app.getPath('appData'), 'Lightz')
  if (existsSync(oldPath) && !existsSync(newPath)) {
    try {
      renameSync(oldPath, newPath)
      console.log('[main] migrated userData Church Lights → Lightz')
    } catch (e) {
      console.error('[main] userData migration failed:', e)
    }
  }
})()

let mainWindow: BrowserWindow | null = null
const dmxManager = new DmxManager()

function sendDmxStatus(status: string): void {
  mainWindow?.webContents.send('dmx:status', status)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'Lightz',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function tryConnect(devicePath: string): void {
  if (!devicePath) return
  const cfg = getConfig()
  dmxManager.connect(devicePath, cfg.dmxOutputPort, sendDmxStatus)
}

app.whenReady().then(() => {
  migrateShowsFolder()
  registerIpcHandlers(dmxManager, (newPath) => {
    tryConnect(newPath)
  })
  createWindow()

  const config = getConfig()

  const server = createCompanionServer(
    () => getConfig().scenes,
    (sceneId) => {
      const cfg = getConfig()
      const scene = cfg.scenes.find((s) => s.id === sceneId)
      if (!scene) return
      dmxManager.activateScene(
        scene.values,
        cfg.fixtures,
        scene.fadeDuration,
        (fid) => cfg.fixtures.find((f) => f.id === fid)
      )
    }
  )
  server.listen(config.companionPort, '127.0.0.1', () => {
    console.log(`Companion server listening on port ${config.companionPort}`)
  })

  // Only connect if a device path has been configured
  tryConnect(config.devicePath)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
