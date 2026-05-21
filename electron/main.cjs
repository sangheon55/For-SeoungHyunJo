const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

// ── 데이터 파일 ──────────────────────────────────────────────
// userData 폴더는 appId 기준 고정 경로다. 앱(.exe)을 매주 새로 교체해도
// 이 경로는 바뀌지 않으므로 데이터(planner-data.json)가 그대로 유지된다.
const DATA_FILE = () => path.join(app.getPath('userData'), 'planner-data.json')

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE(), 'utf-8'))
  } catch {
    return null
  }
}
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE(), JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (e) {
    return false
  }
}

ipcMain.handle('store:load', () => readData())
ipcMain.handle('store:save', (_e, data) => writeData(data))
ipcMain.handle('store:path', () => DATA_FILE())
ipcMain.handle('store:openFolder', () => shell.showItemInFolder(DATA_FILE()))

ipcMain.handle('store:export', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '데이터 내보내기',
    defaultPath: '조성현플래너-데이터.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (canceled || !filePath) return false
  try {
    fs.copyFileSync(DATA_FILE(), filePath)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('store:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '데이터 가져오기',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths || !filePaths[0]) return null
  try {
    const txt = fs.readFileSync(filePaths[0], 'utf-8')
    const parsed = JSON.parse(txt)
    fs.writeFileSync(DATA_FILE(), txt, 'utf-8')
    return parsed
  } catch {
    return null
  }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#F1F8E9',
    title: '조성현 합격 플래너',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  win.setMenuBarVisibility(false)
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
