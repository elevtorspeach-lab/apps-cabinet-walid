const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cabinetDesktopState', {
  getStatePath: () => ipcRenderer.invoke('desktop-state:get-path'),
  readState: () => ipcRenderer.invoke('desktop-state:read'),
  writeState: (payload) => ipcRenderer.invoke('desktop-state:write', payload),
  openStateFile: () => ipcRenderer.invoke('desktop-state:open-file'),
  saveExportAndOpen: (payload) => ipcRenderer.invoke('desktop-export:save-open', payload)
});
