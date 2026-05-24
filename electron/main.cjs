const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const { spawn } = require('child_process')

// ── 업데이트 설정 ────────────────────────────────────────────
const GH_REPO = 'sangheon55/For-SeoungHyunJo'
const GH_API_LATEST = `https://api.github.com/repos/${GH_REPO}/releases/latest`
const GH_RELEASES_PAGE = `https://github.com/${GH_REPO}/releases`

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

// ── 업데이트 헬퍼 ────────────────────────────────────────────
function compareSemver(a, b) {
  const pa = String(a || '').replace(/^v/, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b || '').replace(/^v/, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0
    if (x !== y) return x > y ? 1 : -1
  }
  return 0
}

function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume()
        return resolve(httpsGetJson(res.headers.location, headers))
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }
      let body = ''
      res.setEncoding('utf-8')
      res.on('data', (c) => { body += c })
      res.on('end', () => { try { resolve(JSON.parse(body)) } catch (e) { reject(e) } })
    }).on('error', reject)
  })
}

function httpsDownload(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Seonghyeon-Planner' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume()
        return resolve(httpsDownload(res.headers.location, dest, onProgress))
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)) }
      const total = Number(res.headers['content-length']) || 0
      let received = 0
      const file = fs.createWriteStream(dest)
      res.on('data', (chunk) => {
        received += chunk.length
        if (onProgress) onProgress(total > 0 ? Math.round((received / total) * 100) : 0)
      })
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
      file.on('error', (e) => { try { fs.unlinkSync(dest) } catch {} ; reject(e) })
    }).on('error', reject)
  })
}

function runPowerShell(args) {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', args, { windowsHide: true })
    let err = ''
    ps.stderr.on('data', (d) => { err += d.toString() })
    ps.on('error', reject)
    ps.on('close', (code) => code === 0 ? resolve() : reject(new Error(`PowerShell exit ${code}\n${err}`)))
  })
}

ipcMain.handle('update:currentVersion', () => app.getVersion())

ipcMain.handle('update:check', async () => {
  const json = await httpsGetJson(GH_API_LATEST, {
    'User-Agent': 'Seonghyeon-Planner',
    Accept: 'application/vnd.github+json',
  })
  const latest = (json.tag_name || '').replace(/^v/, '')
  const current = app.getVersion()
  const asset = (json.assets || []).find((a) => /\.zip$/i.test(a.name)) || null
  return {
    current,
    latest,
    hasUpdate: latest ? compareSemver(latest, current) > 0 : false,
    notes: json.body || '',
    downloadUrl: asset?.browser_download_url || null,
    downloadSize: asset?.size || 0,
    assetName: asset?.name || '',
    publishedAt: json.published_at || '',
    htmlUrl: json.html_url || GH_RELEASES_PAGE,
  }
})

ipcMain.handle('update:download', async (e, url) => {
  if (!url) throw new Error('다운로드 URL이 없어요')
  const updatesDir = path.join(app.getPath('userData'), 'updates')
  try { fs.rmSync(updatesDir, { recursive: true, force: true }) } catch {}
  fs.mkdirSync(updatesDir, { recursive: true })
  const zipPath = path.join(updatesDir, 'download.zip')
  const extractDir = path.join(updatesDir, 'extracted')

  e.sender.send('update:progress', { phase: 'download', pct: 0 })
  await httpsDownload(url, zipPath, (pct) => {
    e.sender.send('update:progress', { phase: 'download', pct })
  })
  e.sender.send('update:progress', { phase: 'download', pct: 100 })

  e.sender.send('update:progress', { phase: 'extract', pct: 0 })
  await runPowerShell([
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
    `Expand-Archive -Force -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}'`,
  ])
  e.sender.send('update:progress', { phase: 'extract', pct: 100 })

  // 압축 안에 단일 폴더가 있는 구조 가정. 첫 폴더 또는 'Seonghyeon Planner'이 포함된 폴더 우선.
  const entries = fs.readdirSync(extractDir, { withFileTypes: true }).filter((d) => d.isDirectory())
  if (entries.length === 0) throw new Error('압축 결과에서 앱 폴더를 찾지 못했어요')
  const picked = entries.find((d) => /Seonghyeon Planner/i.test(d.name)) || entries[0]
  const extractedAppPath = path.join(extractDir, picked.name)
  // 실행 파일 존재 확인
  const exeCandidates = fs.readdirSync(extractedAppPath).filter((n) => /\.exe$/i.test(n))
  if (exeCandidates.length === 0) throw new Error('압축 결과에 .exe 파일이 없어요')
  return { extractedAppPath }
})

ipcMain.handle('update:install', async (_e, extractedAppPath) => {
  if (!app.isPackaged) throw new Error('개발 모드에서는 자동 설치를 막아두었어요')
  if (!extractedAppPath || !fs.existsSync(extractedAppPath)) throw new Error('압축 해제된 폴더가 없어요')

  const currentAppDir = path.dirname(process.execPath)
  const exeName = path.basename(process.execPath)
  const batPath = path.join(app.getPath('userData'), 'updates', 'apply.bat')
  const newExePath = path.join(currentAppDir, exeName)
  const cleanupDir = path.dirname(batPath)

  // robocopy /MIR : 거울 복사. exit code 0~7은 성공, 8 이상이 실패.
  const bat = `@echo off
chcp 65001 >nul
timeout /t 3 /nobreak >nul
robocopy "${extractedAppPath}" "${currentAppDir}" /MIR /NFL /NDL /NJH /NJS /NC /NS
set RC=%ERRORLEVEL%
if %RC% GEQ 8 (
  echo.
  echo 업데이트 실패: robocopy 오류 코드 %RC%
  echo 폴더 권한이 부족하거나 파일이 잠겨 있을 수 있습니다.
  pause
  exit /b 1
)
start "" "${newExePath}"
rmdir /s /q "${cleanupDir}"
`
  fs.writeFileSync(batPath, bat, { encoding: 'utf-8' })

  const child = spawn('cmd.exe', ['/c', batPath], {
    detached: true, stdio: 'ignore', windowsHide: true,
  })
  child.unref()
  setTimeout(() => app.quit(), 600)
  return true
})

ipcMain.handle('update:openReleases', () => shell.openExternal(GH_RELEASES_PAGE))

// 임의 외부 URL 열기 — http/https만 허용
ipcMain.handle('shell:openExternal', async (_e, url) => {
  if (typeof url !== 'string') return false
  if (!/^https?:\/\//i.test(url)) return false
  try { await shell.openExternal(url); return true } catch { return false }
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
    icon: path.join(__dirname, 'icon.ico'),
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
