/**
 * Preload bridge — the only surface the renderer can reach the OS through.
 * Mirrors the `HandscriptBridge` type in apps/renderer/src/types/bridge.d.ts.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('handscript', {
  openProject: (): Promise<{ path: string; json: string } | null> =>
    ipcRenderer.invoke('project:open'),

  saveProject: (path: string | null, json: string): Promise<{ path: string } | null> =>
    ipcRenderer.invoke('project:save', path, json),

  saveFile: (
    defaultName: string,
    data: Uint8Array,
    filters: { name: string; extensions: string[] }[],
  ): Promise<{ path: string } | null> =>
    ipcRenderer.invoke('file:save', defaultName, data, filters),

  printHtml: (html: string, options: { landscape: boolean }): Promise<void> =>
    ipcRenderer.invoke('print:html', html, options),

  htmlToPdf: (html: string, widthMm: number, heightMm: number): Promise<Uint8Array> =>
    ipcRenderer.invoke('pdf:fromHtml', html, widthMm, heightMm),

  platform: process.platform as 'win32' | 'darwin' | 'linux',
});
