const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow

function createWindow() {
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    // fullscreen: true, // 直接全屏
    // fullscreenable: true, // 允许全屏（默认true）
    // frame: true,
    width: width,
    height: height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // 可选图标
    show: false // 先隐藏，加载完成后再显示
  })

  // mainWindow.webContents.openDevTools()

  // 加载应用
  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../../dist/index.html')}`

  console.info(`isDev=${isDev}, startUrl=${startUrl}`)

  mainWindow.loadURL(startUrl)

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()

    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // 在 macOS 上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 当所有窗口都关闭时退出应用，除了 macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理程序
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('select-file', async (extensions) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions}
    ]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0] // 返回第一个选择的文件路径
  }
  return null
})

// 安全设置：阻止新窗口
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    console.log('Blocked new window to:', navigationUrl)
  })
})
