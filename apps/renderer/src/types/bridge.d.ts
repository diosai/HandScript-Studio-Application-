/**
 * Typed surface of the Electron preload bridge (see apps/desktop/src/preload.ts).
 * Undefined when running in a plain browser — callers must feature-detect.
 */
export interface HandscriptBridge {
  /** Show an open dialog and read a .hsproj file. Returns null on cancel. */
  openProject(): Promise<{ path: string; json: string } | null>;
  /** Save project JSON; shows a save dialog when path is null. */
  saveProject(path: string | null, json: string): Promise<{ path: string } | null>;
  /** Show a save dialog and write binary data (exports). */
  saveFile(
    defaultName: string,
    data: Uint8Array,
    filters: { name: string; extensions: string[] }[],
  ): Promise<{ path: string } | null>;
  /** Print HTML content via the OS print dialog (supports duplex/printer selection). */
  printHtml(html: string, options: { landscape: boolean }): Promise<void>;
  /** Export the given print-HTML to a vector PDF via Chromium's printToPDF. */
  htmlToPdf(html: string, widthMm: number, heightMm: number): Promise<Uint8Array>;
  platform: 'win32' | 'darwin' | 'linux';
}

declare global {
  interface Window {
    handscript?: HandscriptBridge;
  }
}

export {};
