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
