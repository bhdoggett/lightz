import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { DmxManager } from '../dmx'
import { createCompanionServer } from '../server'
import { registerIpcHandlers } from '../ipc'
import { getConfig, setDevicePath } from '../store'
import { findEnttecPort } from '../ports'
import type { DmxStatus } from '../../src/shared/types'

// Suppress unhandled serial port errors so Electron's JS error dialog never fires.
process.on('uncaughtException', (err) => {
  console.error('[main] uncaught exception (suppressed from dialog):', err.message)
})

let mainWindow: BrowserWindow | null = null
const dmxManager = new DmxManager()
let currentDmxStatus: DmxStatus = 'disconnected'
let lastAutoConnectAttempt: string | null = null

function sendDmxStatus(status: DmxStatus): void {
  currentDmxStatus = status
  if (status === 'disconnected' || status === 'error') lastAutoConnectAttempt = null
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

  // Re-send current status once renderer is ready — startup connect fires before renderer loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('dmx:status', currentDmxStatus)
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
      mainWindow?.webContents.send('scene:activated', sceneId)
    }
  )
  server.listen(config.companionPort, '127.0.0.1', () => {
    console.log(`Companion server listening on port ${config.companionPort}`)
  })

  // On startup, auto-connect to Enttec if no path configured yet
  if (!config.devicePath) {
    const enttecPort = findEnttecPort()
    if (enttecPort) {
      setDevicePath(enttecPort)
      tryConnect(enttecPort)
      lastAutoConnectAttempt = enttecPort
    }
  } else {
    tryConnect(config.devicePath)
  }

  // Poll for Enttec device hotplug (fs.watch doesn't fire on macOS devfs)
  setInterval(() => {
    if (currentDmxStatus === 'connected') return
    const port = findEnttecPort()
    if (!port || port === lastAutoConnectAttempt) return
    lastAutoConnectAttempt = port
    setDevicePath(port)
    tryConnect(port)
    mainWindow?.webContents.send('device:autoConnected', port)
  }, 3000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
