import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const distPreload = path.join(app.getAppPath(), 'dist-electron', 'preload.cjs');
  const srcPreload = path.join(app.getAppPath(), 'electron', 'preload.cjs');
  
  const preloadPath = fs.existsSync(distPreload) ? distPreload : srcPreload;

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "OMEGA Manifest Editor | Era 6.1 Aseptic",
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const url = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  win.loadURL(url);
  
  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC HANDLERS ---
const MODULES_ROOT = 'd:/desarrollos/ABDOmega/Resources/modules';

ipcMain.handle('read-modules', async () => {
  if (!fs.existsSync(MODULES_ROOT)) return [];
  return fs.readdirSync(MODULES_ROOT).filter(f => fs.lstatSync(path.join(MODULES_ROOT, f)).isDirectory());
});

ipcMain.handle('read-file', async (_, filePath: string) => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(MODULES_ROOT, filePath);
  return fs.readFileSync(fullPath, 'utf-8');
});

ipcMain.handle('file-exists', async (_, filePath: string) => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(MODULES_ROOT, filePath);
  return fs.existsSync(fullPath);
});

ipcMain.handle('scan-wasm', async (_, filePath: string) => {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(MODULES_ROOT, filePath);
    if (!fs.existsSync(fullPath)) return { error: "File not found" };
    
    const buffer = fs.readFileSync(fullPath);
    const wasmModule = await WebAssembly.compile(buffer);
    const exports = WebAssembly.Module.exports(wasmModule);
    
    return {
      exports: exports.map(e => ({ name: e.name, kind: e.kind }))
    };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('save-file-dialog', async (_, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: path.join(MODULES_ROOT, defaultName),
    filters: [
      { name: 'OMEGA Aseptic Manifest', extensions: ['acemm'] },
      { name: 'Aseptic Working Draft', extensions: ['working'] },
      { name: 'Legacy YAML', extensions: ['yaml', 'yml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'OMEGA Manifests', extensions: ['acemm', 'yaml', 'yml', 'working'] },
      { name: 'Working Drafts', extensions: ['working'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { filePath, content };
});

ipcMain.handle('write-file', async (_, { filePath, content }) => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(MODULES_ROOT, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  return { success: true };
});

ipcMain.handle('delete-file', async (_, filePath: string) => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(MODULES_ROOT, filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return { success: true };
  }
  return { success: false, error: "File not found" };
});
