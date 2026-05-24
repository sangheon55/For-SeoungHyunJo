const { contextBridge, ipcRenderer } = require('electron')

// 렌더러(React)에서 window.plannerStore 로 데이터 파일에 접근한다.
// 데이터는 앱 버전과 무관한 고정 경로의 JSON 파일에 저장되므로,
// 매주 새 .exe 로 교체해도 데이터는 그대로 유지된다.
contextBridge.exposeInMainWorld('plannerStore', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.invoke('store:save', data),
  exportTo: () => ipcRenderer.invoke('store:export'),
  importFrom: () => ipcRenderer.invoke('store:import'),
  openFolder: () => ipcRenderer.invoke('store:openFolder'),
  filePath: () => ipcRenderer.invoke('store:path'),
})

// 외부 링크 열기 (자주 가는 곳 등에서 사용)
contextBridge.exposeInMainWorld('plannerShell', {
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
})

// 앱 내 업데이트 — GitHub Releases 기반
contextBridge.exposeInMainWorld('plannerUpdater', {
  currentVersion: () => ipcRenderer.invoke('update:currentVersion'),
  check: () => ipcRenderer.invoke('update:check'),
  download: (url) => ipcRenderer.invoke('update:download', url),
  install: (extractedAppPath) => ipcRenderer.invoke('update:install', extractedAppPath),
  openReleases: () => ipcRenderer.invoke('update:openReleases'),
  hasLog: () => ipcRenderer.invoke('update:hasLog'),
  openLog: () => ipcRenderer.invoke('update:openLog'),
  onProgress: (cb) => {
    const handler = (_e, payload) => cb(payload)
    ipcRenderer.on('update:progress', handler)
    return () => ipcRenderer.removeListener('update:progress', handler)
  },
})
