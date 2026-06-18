import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { DmxManager } from '../dmx'
import { createCompanionServer } from '../server'
import { registerIpcHandlers } from '../ipc'
import { getConfig, setDevicePath } from '../store'
import { findEnttecPort } from '../ports'
import { ensureShowsDir } from '../shows-library'
import type { DmxStatus } from '../../src/shared/types'

// Suppress unhandled serial port errors so Electron's JS error dialog never fires.
process.on('uncaughtException', (err) => {
  console.error('[main] uncaught exception (suppressed from dialog):', err.message)
})

app.name = 'Lightz'

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
  ensureShowsDir()
  registerIpcHandlers(dmxManager, (newPath) => {
    tryConnect(newPath)
  })
  createWindow()

  const isMac = process.platform === 'darwin'
  const send = (channel: string) => () => mainWindow?.webContents.send(channel)

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Show', accelerator: 'CmdOrCtrl+N', click: send('menu:newShow') },
        { label: 'Save Show', accelerator: 'CmdOrCtrl+S', click: send('menu:saveShow') },
        { label: 'Shows…', accelerator: 'CmdOrCtrl+Shift+O', click: send('menu:openShows') },
        { type: 'separator' },
        { label: 'Export Show…', accelerator: 'CmdOrCtrl+Shift+E', click: send('menu:exportShow') },
        { label: 'Import Show…', accelerator: 'CmdOrCtrl+Shift+I', click: send('menu:importShow') },
        ...(isMac ? [] : [
          { type: 'separator' as const },
          { role: 'quit' as const },
        ]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Save Scene', accelerator: 'CmdOrCtrl+Shift+S', click: send('menu:saveScene') },
        { label: 'Add Scene…', click: send('menu:addScene') },
        { label: 'Add Channels…', click: send('menu:addChannels') },
        { label: 'Add Custom Fixture…', click: send('menu:addFixture') },
        { label: 'Add Group…', click: send('menu:addGroup') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Full View', accelerator: 'CmdOrCtrl+1', click: send('menu:viewFull') },
        { label: 'Custom View', accelerator: 'CmdOrCtrl+2', click: send('menu:viewCustom') },
        { type: 'separator' },
        { label: 'All Off', accelerator: 'CmdOrCtrl+Shift+X', click: send('menu:allOff') },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: send('menu:openSettings') },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
        ] : [
          { role: 'close' as const },
        ]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/bhdoggett/lightz'),
        },
        {
          label: 'Releases & Changelog',
          click: () => shell.openExternal('https://github.com/bhdoggett/lightz/releases'),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  const config = getConfig()

  const server = createCompanionServer(
    () => getConfig().scenes,
    (sceneId) => {
      const cfg = getConfig()
      const scene = cfg.scenes.find((s) => s.id === sceneId)
      if (!scene) return
      dmxManager.activateScene(
        scene.values,
        scene.fadeDuration,
        (id) => {
          const f = cfg.fixtures.find((f) => f.id === id)
          if (f && !f.channels) return { channel: f.channel, universe: f.universe, type: f.type }
          for (const fixture of cfg.fixtures) {
            if (!fixture.channels) continue
            const ch = fixture.channels.find((c) => c.id === id)
            if (ch) return { channel: ch.channel, universe: ch.universe, type: 'dimmer' }
          }
          return undefined
        }
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
