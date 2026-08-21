import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import windowStateKeeper from 'electron-window-state'
import { registerIpc, mongoManager } from './ipc/register.js'
import { closeAppDb } from './ipc/metadata.js'
import { clearConnections } from './db/connections.js'
import { IPC_CHANNELS } from '../shared/rowport-api.js'

if (process.env.ROWPORT_USER_DATA) {
  app.setPath('userData', process.env.ROWPORT_USER_DATA)
}

process.on('uncaughtException', (error) => {
  console.error('[Rowport] Uncaught exception:', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Rowport] Unhandled rejection:', reason)
})

const icon = join(__dirname, '../../resources/icon.png')
const winIcon = join(__dirname, '../../resources/icon.ico')

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  })

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux'
      ? { icon }
      : process.platform === 'win32'
        ? { icon: winIcon }
        : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindowState.manage(mainWindow)

  const notifyMaximized = (): void => {
    mainWindow?.webContents.send(
      IPC_CHANNELS.windowMaximizedChange,
      mainWindow?.isMaximized() ?? false
    )
  }
  mainWindow.on('maximize', notifyMaximized)
  mainWindow.on('unmaximize', notifyMaximized)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.rowport.app')

  // Restore VITE_DEV_SERVER_URL if saved from a previous restart
  const savedUrlPath = join(app.getPath('userData'), 'vite-dev-url.txt')
  if (existsSync(savedUrlPath)) {
    const savedUrl = readFileSync(savedUrlPath, 'utf-8').trim()
    if (savedUrl) {
      process.env.VITE_DEV_SERVER_URL = savedUrl
    }
  }

  app.on('browser-window-created', (_, window) => {
    if (!app.isPackaged) {
      window.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
          window.webContents.toggleDevTools()
          event.preventDefault()
        }
      })
    }
  })

  registerIpc(() => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  void clearConnections()
  mongoManager.clear()
  closeAppDb()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
