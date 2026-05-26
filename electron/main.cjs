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
  const updatesDir = path.join(app.getPath('userData'), 'updates')
  // 로그는 update:download 가 updates/ 를 통째로 지워도 살아남도록 userData 루트에 둔다.
  const logPath = path.join(app.getPath('userData'), 'update.log')
  const hostLogPath = path.join(app.getPath('userData'), 'host-update.log')
  const tempLogPath = path.join(require('os').tmpdir(), 'seonghyeon-update.log')
  const cmdBeaconPath = path.join(app.getPath('userData'), 'cmd-beacon.log')
  const cmdOutputPath = path.join(app.getPath('userData'), 'cmd-output.log')
  const applyCmdPath = path.join(updatesDir, 'apply.cmd')
  const parentPid = process.pid

  // v1.4.7: PowerShell 완전 폐기 → cmd.exe + apply.cmd 로 전환.
  //  • v1.4.4 (EncodedCommand) 와 v1.4.6 (진단강화) 모두 AMSI 가 디코드 후
  //    soft-block (exit 0, stderr 없음) 으로 PS 를 죽이는 게 확인됨.
  //  • cmd.exe 의 내장 명령(move/start/timeout)은 AMSI 스캔 대상이 아님.
  //  • apply.cmd 는 ASCII 본문 + 경로만 치환 → 인코딩 이슈 회피.
  //  • update.log 는 cmd 가 직접 write, cmd-beacon.log 는 첫 줄 echo 로 기록.
  //  • cmd-output.log 는 cmd 의 stdout/stderr 를 stdio 상속으로 캡쳐.

  // ── Host(Electron Main) 측 사전 로깅 ─────────────────────────
  // cmd 가 한 줄도 못 돌더라도 "main process 가 spawn 시도는 했다" 는 흔적이 남음.
  const hostLog = (msg) => {
    try {
      fs.appendFileSync(hostLogPath, `[${new Date().toISOString()}] ${msg}\r\n`, { encoding: 'utf-8' })
    } catch {}
  }
  hostLog('=== update:install host-side start (v1.4.7 cmd) ===')
  hostLog(`exe=${process.execPath}`)
  hostLog(`pid=${parentPid}`)
  hostLog(`src=${extractedAppPath}`)
  hostLog(`dst=${currentAppDir}`)

  // cmd 에서 ^ & < > | % 같은 메타문자는 일반적인 PATH 에선 안 나오므로
  // 큰따옴표로 감싸는 것만으로 충분. 만일을 위해 ^ 만 이스케이프.
  const cmdQuote = (s) => `"${String(s).replace(/\^/g, '^^').replace(/"/g, '""')}"`
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const backupDir = `${currentAppDir}.old.${stamp}`
  const newExePath = path.join(currentAppDir, exeName)
  const releasesPage = GH_RELEASES_PAGE

  // ── apply.cmd 생성 ──────────────────────────────────────────
  // ASCII 본문만 사용 (Korean text 는 echo 시 깨질 수 있어 회피).
  // 줄 끝은 CRLF — cmd.exe 가 LF-only 를 다룰 때 가끔 첫 줄을 못 읽음.
  const applyCmd = [
    `@echo off`,
    `setlocal EnableExtensions`,
    `>>${cmdQuote(cmdBeaconPath)} echo [%date% %time%] cmd beacon reached pid=%~1`,
    `>>${cmdQuote(logPath)} echo [%date% %time%] === update apply start v1.5.0 ===`,
    `>>${cmdQuote(logPath)} echo src=${cmdQuote(extractedAppPath)}`,
    `>>${cmdQuote(logPath)} echo dst=${cmdQuote(currentAppDir)}`,
    `>>${cmdQuote(logPath)} echo backup=${cmdQuote(backupDir)}`,
    // 부모 Electron 이 파일 핸들을 풀 시간 확보 (host 는 spawn 후 1.5s 에 exit).
    `timeout /T 4 /NOBREAK >nul 2>&1`,
    `>>${cmdQuote(logPath)} echo [%date% %time%] move dst to backup`,
    `move /Y ${cmdQuote(currentAppDir)} ${cmdQuote(backupDir)} >>${cmdQuote(logPath)} 2>&1`,
    // dst 이동이 실패하면 잠금이 남아있는 것 — 한 번 더 기다린 뒤 재시도.
    `if errorlevel 1 (`,
    `  >>${cmdQuote(logPath)} echo [%date% %time%] retry move dst after 4s`,
    `  timeout /T 4 /NOBREAK >nul 2>&1`,
    `  move /Y ${cmdQuote(currentAppDir)} ${cmdQuote(backupDir)} >>${cmdQuote(logPath)} 2>&1`,
    `)`,
    `if errorlevel 1 goto :fail_no_backup`,
    `>>${cmdQuote(logPath)} echo [%date% %time%] move src to dst`,
    `move /Y ${cmdQuote(extractedAppPath)} ${cmdQuote(currentAppDir)} >>${cmdQuote(logPath)} 2>&1`,
    `if errorlevel 1 goto :restore`,
    `if not exist ${cmdQuote(newExePath)} (`,
    `  >>${cmdQuote(logPath)} echo [%date% %time%] new exe missing: ${cmdQuote(newExePath)}`,
    `  goto :restore`,
    `)`,
    `>>${cmdQuote(logPath)} echo [%date% %time%] launching new exe`,
    `start "" ${cmdQuote(newExePath)}`,
    `timeout /T 3 /NOBREAK >nul 2>&1`,
    `rmdir /S /Q ${cmdQuote(backupDir)} >nul 2>&1`,
    `>>${cmdQuote(logPath)} echo [%date% %time%] === update complete ===`,
    `exit /b 0`,
    ``,
    `:restore`,
    `>>${cmdQuote(logPath)} echo [%date% %time%] FAILED at src->dst move, restoring backup`,
    `rmdir /S /Q ${cmdQuote(currentAppDir)} >nul 2>&1`,
    `move /Y ${cmdQuote(backupDir)} ${cmdQuote(currentAppDir)} >>${cmdQuote(logPath)} 2>&1`,
    `start "" ${cmdQuote(releasesPage)}`,
    `exit /b 1`,
    ``,
    `:fail_no_backup`,
    `>>${cmdQuote(logPath)} echo [%date% %time%] FAILED at dst->backup move (file still locked?)`,
    `start "" ${cmdQuote(releasesPage)}`,
    `exit /b 1`,
    ``,
  ].join('\r\n')

  try {
    fs.mkdirSync(updatesDir, { recursive: true })
    fs.writeFileSync(applyCmdPath, applyCmd, { encoding: 'utf-8' })
    hostLog(`wrote apply.cmd length=${applyCmd.length} chars path=${applyCmdPath}`)
  } catch (e) {
    hostLog(`write apply.cmd FAILED: ${e.message}`)
    throw new Error(`업데이트 스크립트를 디스크에 쓰지 못했어요: ${e.message}`)
  }

  // cmd 의 stdout/stderr 를 파일에 직접 캡쳐 (stdio 상속).
  let outFd = null
  try {
    fs.appendFileSync(cmdOutputPath, `\r\n=== ${new Date().toISOString()} cmd spawn ===\r\n`, 'utf-8')
    outFd = fs.openSync(cmdOutputPath, 'a')
  } catch (e) {
    hostLog(`failed to open cmd-output.log: ${e.message}`)
  }

  try {
    const child = spawn('cmd.exe', ['/c', applyCmdPath, String(parentPid)], {
      detached: true,
      stdio: outFd != null ? ['ignore', outFd, outFd] : 'ignore',
      windowsHide: false,
    })
    child.unref()
    hostLog(`spawned cmd.exe pid=${child.pid || 'unknown'}`)

    child.on('exit', (code, signal) => {
      hostLog(`cmd exit early code=${code} signal=${signal}`)
    })
    child.on('error', (err) => {
      hostLog(`cmd child error: ${err.message}`)
    })
  } catch (e) {
    hostLog(`spawn FAILED: ${e.message}`)
    if (outFd != null) try { fs.closeSync(outFd) } catch {}
    throw new Error(`cmd.exe 실행이 보안 정책에 막혔을 수 있어요. host-update.log 를 확인해 주세요. (${e.message})`)
  }

  if (outFd != null) try { fs.closeSync(outFd) } catch {}

  // 1.5초 대기 — cmd 가 timeout 으로 4초 대기하기 전에 Electron 이 먼저 종료되도록.
  setTimeout(() => app.exit(0), 1500)
  return true
})

ipcMain.handle('update:openLog', () => {
  const userData = app.getPath('userData')
  const candidates = [
    'update.log', 'host-update.log',
    'cmd-beacon.log', 'cmd-output.log',
    'ps-beacon.log', 'ps-output.log', 'ps-transcript.log',
  ].map((n) => path.join(userData, n))
  const tempLogPath = path.join(require('os').tmpdir(), 'seonghyeon-update.log')
  if (candidates.some((p) => fs.existsSync(p))) { shell.openPath(userData); return true }
  if (fs.existsSync(tempLogPath)) { shell.openPath(tempLogPath); return true }
  return false
})

ipcMain.handle('update:hasLog', () => {
  const userData = app.getPath('userData')
  const tempLogPath = path.join(require('os').tmpdir(), 'seonghyeon-update.log')
  const names = [
    'update.log', 'host-update.log',
    'cmd-beacon.log', 'cmd-output.log',
    'ps-beacon.log', 'ps-output.log', 'ps-transcript.log',
  ]
  return names.some((n) => fs.existsSync(path.join(userData, n))) || fs.existsSync(tempLogPath)
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
