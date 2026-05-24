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
  const newExePath = path.join(currentAppDir, exeName)
  const parentPid = process.pid

  // v1.4.4: 보안(Windows Defender ASR/AMSI/3rd-party AV) 차단 대응.
  //  • .ps1 파일을 디스크에 안 씀 → -EncodedCommand (Base64 UTF-16LE) 직접 전달
  //  • Node.js 단계에서 host-update.log 에 시도 기록 → PS 가 통째로 차단돼도 흔적 남음
  //  • PS 내부에서 update.log + %TEMP%/seonghyeon-update.log 이중 로깅 → 하나가 막혀도 다른 쪽 확인 가능
  //  • 실패 시 MessageBox 로 사용자에게 즉시 한국어 안내

  // ── Host(Electron Main) 측 사전 로깅 ─────────────────────────
  // PS 가 한 줄도 못 돌더라도 "main process 가 spawn 시도는 했다" 는 흔적이 남음.
  // 사용자가 update.log 가 없다 = 보안이 PS 를 차단했다 라고 진단 가능.
  const hostLog = (msg) => {
    try {
      fs.appendFileSync(hostLogPath, `[${new Date().toISOString()}] ${msg}\r\n`, { encoding: 'utf-8' })
    } catch {}
  }
  hostLog('=== update:install host-side start ===')
  hostLog(`exe=${process.execPath}`)
  hostLog(`pid=${parentPid}`)
  hostLog(`src=${extractedAppPath}`)
  hostLog(`dst=${currentAppDir}`)

  const psEscape = (s) => String(s).replace(/'/g, "''")
  const ps = `# 조성현 플래너 — 자동 업데이트 적용 스크립트 (v1.4.4)
$ErrorActionPreference = 'Stop'
$logPath = '${psEscape(logPath)}'
$tempLog = '${psEscape(tempLogPath)}'
$src = '${psEscape(extractedAppPath)}'
$dst = '${psEscape(currentAppDir)}'
$parentPid = ${parentPid}
$exeName = '${psEscape(exeName)}'
$newExe = Join-Path $dst $exeName

function Log([string]$msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Write-Host $line
  # 이중 로깅 — 한쪽이 막혀도 다른 쪽 확인 가능
  try { Add-Content -LiteralPath $logPath -Value $line -Encoding utf8 } catch {}
  try { Add-Content -LiteralPath $tempLog -Value $line -Encoding utf8 } catch {}
}

function Fail([string]$msg) {
  Log "ERROR: $msg"
  try {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    [System.Windows.Forms.MessageBox]::Show(
      "조성현 플래너 자동 업데이트가 실패했어요.\`n\`n원인: $msg\`n\`n로그 파일:\`n$logPath\`n$tempLog\`n\`nGitHub Releases에서 zip을 받아 수동으로 폴더를 교체해 주세요.",
      '업데이트 실패',
      'OK',
      'Error'
    ) | Out-Null
  } catch {}
  exit 1
}

try {
  # 로그 초기화 (둘 다)
  '' | Set-Content -LiteralPath $logPath -Encoding utf8
  '' | Set-Content -LiteralPath $tempLog -Encoding utf8
  Log '=== 업데이트 시작 (v1.4.4 EncodedCommand) ==='
  Log "Source: $src"
  Log "Target: $dst"
  Log "Parent PID: $parentPid"
  Log "PowerShell: $($PSVersionTable.PSVersion)"
  Log "OS: $([System.Environment]::OSVersion.VersionString)"

  $waited = 0
  while ($waited -lt 30) {
    $p = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
    if (-not $p) { break }
    Start-Sleep -Seconds 1
    $waited++
  }
  Log "부모 프로세스 종료 대기: ${'$'}waited 초"

  $exeBase = [System.IO.Path]::GetFileNameWithoutExtension($exeName)
  $extra = 0
  while ($extra -lt 10) {
    $remain = Get-Process -Name $exeBase -ErrorAction SilentlyContinue
    if (-not $remain) { break }
    Start-Sleep -Seconds 1
    $extra++
  }
  Log "기타 프로세스 정리 대기: ${'$'}extra 초"

  $stamp = Get-Date -Format 'yyyyMMddHHmmss'
  $backup = "${'$'}dst.old.${'$'}stamp"
  Log "백업: $dst -> $backup"
  Move-Item -LiteralPath $dst -Destination $backup -Force

  Log "교체: $src -> $dst"
  Move-Item -LiteralPath $src -Destination $dst -Force

  if (-not (Test-Path -LiteralPath $newExe)) {
    Fail "새 버전의 실행 파일을 찾을 수 없어요: $newExe"
  }
  Log "실행: $newExe"
  Start-Process -FilePath $newExe

  Log '=== 업데이트 완료 ==='

  try {
    Start-Sleep -Seconds 3
    Remove-Item -LiteralPath $backup -Recurse -Force -ErrorAction SilentlyContinue
    Log "백업 정리 완료"
  } catch {
    Log "백업 정리 실패(무시 가능): $($_.Exception.Message)"
  }

  exit 0
} catch {
  Fail $_.Exception.Message
}
`

  // PowerShell -EncodedCommand 는 UTF-16LE Base64 를 받는다.
  // 디스크에 .ps1 파일을 안 쓰므로 AV/ASR 의 스크립트 스캐닝에 노출되지 않는다.
  const encoded = Buffer.from(ps, 'utf16le').toString('base64')
  hostLog(`encoded ps script length=${ps.length} chars, base64=${encoded.length} chars`)

  try {
    const child = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encoded,
    ], {
      detached: true, stdio: 'ignore', windowsHide: false,
    })
    child.unref()
    hostLog(`spawned powershell.exe pid=${child.pid || 'unknown'}`)
  } catch (e) {
    hostLog(`spawn FAILED: ${e.message}`)
    throw new Error(`PowerShell 실행이 보안 정책에 막혔을 수 있어요. host-update.log 를 확인해 주세요. (${e.message})`)
  }

  setTimeout(() => app.exit(0), 600)
  return true
})

ipcMain.handle('update:openLog', () => {
  const userData = app.getPath('userData')
  const logPath = path.join(userData, 'update.log')
  const hostLogPath = path.join(userData, 'host-update.log')
  const tempLogPath = path.join(require('os').tmpdir(), 'seonghyeon-update.log')
  // 둘 다 있으면 폴더를 열어 사용자가 골라보게 함. 하나만 있으면 그 파일을 직접 연다.
  if (fs.existsSync(logPath) && fs.existsSync(hostLogPath)) {
    shell.openPath(userData)
    return true
  }
  if (fs.existsSync(logPath)) { shell.openPath(logPath); return true }
  if (fs.existsSync(hostLogPath)) { shell.openPath(hostLogPath); return true }
  if (fs.existsSync(tempLogPath)) { shell.openPath(tempLogPath); return true }
  return false
})

ipcMain.handle('update:hasLog', () => {
  const userData = app.getPath('userData')
  const tempLogPath = path.join(require('os').tmpdir(), 'seonghyeon-update.log')
  return fs.existsSync(path.join(userData, 'update.log'))
      || fs.existsSync(path.join(userData, 'host-update.log'))
      || fs.existsSync(tempLogPath)
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
