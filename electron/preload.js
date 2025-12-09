const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  selectFile: () => ipcRenderer.invoke('select-file'),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // 示例：文件操作（需要主进程实现相应处理器）
  readFile: (filePath) => ipcRenderer.invoke('file-read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file-write', filePath, content)
})

// 也可以暴露一些实用的工具函数
contextBridge.exposeInMainWorld('appUtils', {
  isElectron: true,
  isDev: process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged
})
