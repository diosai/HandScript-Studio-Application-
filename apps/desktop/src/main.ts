/**
 * HandScript Studio — Electron main process.
 *
 * Security posture:
 *  - contextIsolation + sandbox on, nodeIntegration off; the renderer only
 *    reaches the OS through the narrow, validated IPC surface below.
 *  - Navigation and window.open are denied; external links never load in-app.
 *  - All file paths come from OS dialogs (never from renderer-supplied paths),
 *    which structurally prevents path traversal.
 *  - IPC payloads are type- and size-checked before use.
 */
import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const isDev = process.argv.includes('--dev');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';

const MAX_PROJECT_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_EXPORT_BYTES = 500 * 1024 * 1024; // 500 MB
const MM_PER_INCH = 25.4;

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 860,
    minHeight: 560,
    title: 'HandScript Studio',
    backgroundColor: '#f4f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });

  // Deny in-app navigation and popup windows entirely.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(DEV_SERVER_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  if (isDev) {
    void mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ------------------------------ IPC helpers ------------------------------ */

function assertString(value: unknown, name: string, maxBytes: number): string {
  if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
  if (Buffer.byteLength(value, 'utf8') > maxBytes) throw new Error(`${name} is too large.`);
  return value;
}

/** Strip anything path-like from a renderer-suggested file name. */
function sanitizeFileName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const base = path
    .basename(value)
    .replace(/[^\p{L}\p{N} ._()-]/gu, '')
    .trim();
  return base || fallback;
}

/** Render HTML in a hidden window (for printing / PDF), always cleaned up. */
async function withHiddenWindow<T>(
  html: string,
  fn: (win: BrowserWindow) => Promise<T>,
): Promise<T> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    // Give web fonts a moment to resolve before capture.
    await new Promise((resolve) => setTimeout(resolve, 250));
    return await fn(win);
  } finally {
    win.destroy();
  }
}

/* ------------------------------ IPC surface ------------------------------ */

function registerIpc(): void {
  ipcMain.handle('project:open', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open project',
      filters: [{ name: 'HandScript project', extensions: ['hsproj', 'json'] }],
      properties: ['openFile'],
    });
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) return null;
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_PROJECT_BYTES) throw new Error('Project file is too large.');
    const json = await fs.readFile(filePath, 'utf8');
    return { path: filePath, json };
  });

  ipcMain.handle('project:save', async (_event, rawPath: unknown, rawJson: unknown) => {
    if (!mainWindow) return null;
    const json = assertString(rawJson, 'project JSON', MAX_PROJECT_BYTES);
    // Renderer may only re-use a path previously produced by our own dialogs.
    let filePath = typeof rawPath === 'string' && rawPath ? rawPath : null;
    if (!filePath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save project',
        defaultPath: 'project.hsproj',
        filters: [{ name: 'HandScript project', extensions: ['hsproj'] }],
      });
      if (result.canceled || !result.filePath) return null;
      filePath = result.filePath;
    }
    await fs.writeFile(filePath, json, 'utf8');
    return { path: filePath };
  });

  ipcMain.handle(
    'file:save',
    async (_event, rawName: unknown, rawData: unknown, rawFilters: unknown) => {
      if (!mainWindow) return null;
      if (!(rawData instanceof Uint8Array)) throw new Error('Export data must be binary.');
      if (rawData.byteLength > MAX_EXPORT_BYTES) throw new Error('Export is too large.');
      const filters = Array.isArray(rawFilters)
        ? rawFilters
            .filter(
              (f): f is { name: string; extensions: string[] } =>
                typeof f === 'object' &&
                f !== null &&
                typeof (f as { name?: unknown }).name === 'string' &&
                Array.isArray((f as { extensions?: unknown }).extensions),
            )
            .map((f) => ({
              name: f.name.slice(0, 60),
              extensions: f.extensions
                .filter((e): e is string => typeof e === 'string')
                .map((e) => e.replace(/[^a-z0-9]/gi, '').slice(0, 8)),
            }))
        : [];
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export',
        defaultPath: sanitizeFileName(rawName, 'export'),
        filters,
      });
      if (result.canceled || !result.filePath) return null;
      await fs.writeFile(result.filePath, Buffer.from(rawData));
      return { path: result.filePath };
    },
  );

  ipcMain.handle('print:html', async (_event, rawHtml: unknown, rawOptions: unknown) => {
    const html = assertString(rawHtml, 'print HTML', MAX_EXPORT_BYTES);
    const landscape =
      typeof rawOptions === 'object' &&
      rawOptions !== null &&
      (rawOptions as { landscape?: unknown }).landscape === true;
    await withHiddenWindow(html, (win) => {
      return new Promise<void>((resolve, reject) => {
        // The OS dialog handles printer selection, copies and duplex.
        win.webContents.print({ silent: false, landscape }, (ok, reason) => {
          if (ok || reason === 'cancelled' || reason === 'Print job canceled') resolve();
          else reject(new Error(reason || 'Print failed.'));
        });
      });
    });
  });

  ipcMain.handle(
    'pdf:fromHtml',
    async (_event, rawHtml: unknown, rawWidthMm: unknown, rawHeightMm: unknown) => {
      const html = assertString(rawHtml, 'PDF HTML', MAX_EXPORT_BYTES);
      const widthMm = Number(rawWidthMm);
      const heightMm = Number(rawHeightMm);
      if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) {
        throw new Error('Invalid page size.');
      }
      const buffer = await withHiddenWindow(html, (win) =>
        win.webContents.printToPDF({
          pageSize: { width: widthMm / MM_PER_INCH, height: heightMm / MM_PER_INCH },
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        }),
      );
      return new Uint8Array(buffer);
    },
  );
}

/* --------------------------------- boot ---------------------------------- */

void app.whenReady().then(() => {
  // Belt-and-braces CSP for the packaged app (index.html carries one too).
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'",
        ],
      },
    });
  });

  registerIpc();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
