import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- PROJECT PATHS ---
const PROJECT_ROOT = 'd:/desarrollos/ABDOmega';
const MODULES_ROOT = path.join(PROJECT_ROOT, 'Resources/modules');
const CELLS_ROOT = path.join(PROJECT_ROOT, 'Resources/Cells');

// Helper to resolve paths intelligently
const resolvePath = (p: string) => {
  if (path.isAbsolute(p)) return p;
  if (p.startsWith('ui/')) return path.join(PROJECT_ROOT, p);
  if (p.endsWith('.acell')) return path.join(CELLS_ROOT, path.basename(p));
  return path.join(MODULES_ROOT, p);
};

function createWindow() {
  const distPreload = path.join(app.getAppPath(), 'dist-electron', 'preload.cjs');
  const srcPreload = path.join(app.getAppPath(), 'electron', 'preload.cjs');
  
  const preloadPath = fs.existsSync(distPreload) ? distPreload : srcPreload;

  const win = new BrowserWindow({
    width: 1400, // Un poco más ancho para el nuevo layout
    height: 900,
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

// Register custom protocol for local assets
app.whenReady().then(() => {
  protocol.registerFileProtocol('omega-asset', (request, callback) => {
    const url = request.url.replace('omega-asset://', '');
    try {
      // Intentar resolver la ruta. El protocolo recibe rutas como "ui/assets/..."
      const decodedPath = decodeURIComponent(url);
      const fullPath = resolvePath(decodedPath);
      callback({ path: fullPath });
    } catch (error) {
      console.error('Failed to register protocol', error);
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC HANDLERS ---

ipcMain.handle('read-modules', async () => {
  if (!fs.existsSync(MODULES_ROOT)) return [];
  return fs.readdirSync(MODULES_ROOT).filter(f => fs.lstatSync(path.join(MODULES_ROOT, f)).isDirectory());
});

ipcMain.handle('scan-repo', async () => {
  if (!fs.existsSync(MODULES_ROOT)) return [];
  
  const results: any[] = [];
  
  const scanDir = (dir: string) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.lstatSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.acemm') || file.endsWith('.yaml') || file.endsWith('.working')) {
        const relativePath = path.relative(MODULES_ROOT, fullPath);
        results.push({
          name: file,
          path: relativePath,
          fullPath: fullPath,
          mtime: stat.mtime
        });
      }
    }
  };
  
  scanDir(MODULES_ROOT);
  return results;
});

ipcMain.handle('read-cells', async () => {
  if (!fs.existsSync(CELLS_ROOT)) return [];
  const files = fs.readdirSync(CELLS_ROOT).filter(f => f.endsWith('.acell'));
  return files.map(f => {
    const content = fs.readFileSync(path.join(CELLS_ROOT, f), 'utf-8');
    try {
      const parsed = JSON.parse(content);
      return { ...parsed, fileName: f };
    } catch (e) {
      return { id: f, error: "Parse Error" };
    }
  });
});

ipcMain.handle('read-file', async (_, filePath: string) => {
  const fullPath = resolvePath(filePath);
  return fs.readFileSync(fullPath, 'utf-8');
});

ipcMain.handle('file-exists', async (_, filePath: string) => {
  const fullPath = resolvePath(filePath);
  return fs.existsSync(fullPath);
});

ipcMain.handle('scan-wasm', async (_, filePath: string) => {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(MODULES_ROOT, filePath);
    if (!fs.existsSync(fullPath)) return { error: "File not found" };
    
    const buffer = fs.readFileSync(fullPath);
    const wasmModule = await WebAssembly.compile(buffer);
    const exports = WebAssembly.Module.exports(wasmModule);
    const imports = WebAssembly.Module.imports(wasmModule);
    
    return {
      exports: exports.map(e => ({ name: e.name, kind: e.kind })),
      imports: imports.map(i => ({ module: i.module, name: i.name, kind: i.kind }))
    };
  } catch (err: any) {
    return { error: err.message };
  }
});

ipcMain.handle('save-file-dialog', async (_, defaultName: string) => {
  const isCell = defaultName.endsWith('.acell');
  const result = await dialog.showSaveDialog({
    defaultPath: path.join(isCell ? CELLS_ROOT : MODULES_ROOT, defaultName),
    filters: [
      { name: 'OMEGA Aseptic Manifest', extensions: ['acemm'] },
      { name: 'OMEGA Cell Blueprint', extensions: ['acell'] },
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
      { name: 'OMEGA Manifests/Cells', extensions: ['acemm', 'acell', 'yaml', 'yml', 'working'] },
      { name: 'Cell Blueprints', extensions: ['acell'] },
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

ipcMain.handle('sync-schema', async () => {
  const { exec } = await import('child_process');
  // Use PROJECT_ROOT to build the path reliably
  const tool = path.join(PROJECT_ROOT, 'build/src/Core/Release/omega-schema-tool.exe');
  const out = path.join(PROJECT_ROOT, 'tools/manifest-editor/src/schema.json');
  
  if (!fs.existsSync(tool)) {
     return { success: false, error: `Binary NOT FOUND at ${tool}. Please compile the Omega Core in Release mode.` };
  }

  console.log(`[IPC] Executing Sync Command: "${tool}" --output "${out}"`);

  return new Promise((resolve) => {
    exec(`"${tool}" --output "${out}"`, (error, stdout, stderr) => {
      if (error) {
        const errorDetail = error.message || stderr || "Execution failed without error message (check DLL dependencies)";
        console.error('Schema Sync Failed:', errorDetail);
        resolve({ success: false, error: errorDetail });
      } else {
        console.log('Schema Sync Success:', stdout);
        resolve({ success: true, stdout });
      }
    });
  });
});
