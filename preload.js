const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getServerConfigs: () => ipcRenderer.invoke('getServerConfigs'),
  saveAllServerConfigs: (configs) => ipcRenderer.invoke('saveAllServerConfigs', configs),
  selectServerFiles: () => ipcRenderer.invoke('selectServerFiles'),
  copyIconToProgramData: (iconPath) => ipcRenderer.invoke('copyIconToProgramData', iconPath),
  readServerProperties: (serverPath) => ipcRenderer.invoke('readServerProperties', serverPath),
  updateServerProperties: (serverPath, properties) => ipcRenderer.invoke('updateServerProperties', serverPath, properties),
  saveActiveServerData: (data) => ipcRenderer.invoke('saveActiveServerData', data),
});
