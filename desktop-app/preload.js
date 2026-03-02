const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cabinetDesktopState', {
  getStatePath: () => ipcRenderer.invoke('desktop-state:get-path'),
  readState: () => ipcRenderer.invoke('desktop-state:read'),
  writeState: (payload) => ipcRenderer.invoke('desktop-state:write', payload)
});
