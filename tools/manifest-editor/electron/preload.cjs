const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readModules: () => ipcRenderer.invoke('read-modules'),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('save-file-dialog', defaultName),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', { filePath: path, content }),
  fileExists: (path) => ipcRenderer.invoke('file-exists', path),
  scanWasm: (path) => ipcRenderer.invoke('scan-wasm', path),
  deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
  readCells: () => ipcRenderer.invoke('read-cells'),
  syncSchema: () => ipcRenderer.invoke('sync-schema'),
  scanRepo: () => ipcRenderer.invoke('scan-repo'),
});
