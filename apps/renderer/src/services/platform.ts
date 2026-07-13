import { parseProjectFile, PROJECT_FILE_EXTENSION, type ProjectFile } from '@handscript/shared';

/**
 * Platform abstraction: the same renderer runs inside Electron (preload
 * bridge available) and in a plain browser during development. File dialogs
 * fall back to <input type=file> / anchor downloads, and project autosave
 * falls back to localStorage.
 */

const AUTOSAVE_KEY = 'handscript.autosave.v1';
const RECENT_KEY = 'handscript.recent.v1';

export const isElectron = (): boolean => typeof window !== 'undefined' && !!window.handscript;

export async function openProjectDialog(): Promise<{
  project: ProjectFile;
  path: string | null;
} | null> {
  if (window.handscript) {
    const result = await window.handscript.openProject();
    if (!result) return null;
    const parsed = safeParse(result.json);
    if (!parsed.ok) throw new Error(parsed.error);
    rememberRecent(result.path);
    return { project: parsed.project, path: result.path };
  }

  const file = await pickFile(`${PROJECT_FILE_EXTENSION},application/json`);
  if (!file) return null;
  const parsed = safeParse(await file.text());
  if (!parsed.ok) throw new Error(parsed.error);
  return { project: parsed.project, path: null };
}

export async function saveProjectDialog(
  project: ProjectFile,
  path: string | null,
): Promise<string | null> {
  const json = JSON.stringify(project, null, 2);
  if (window.handscript) {
    const result = await window.handscript.saveProject(path, json);
    if (result) rememberRecent(result.path);
    return result?.path ?? null;
  }
  downloadBlob(new Blob([json], { type: 'application/json' }), `project${PROJECT_FILE_EXTENSION}`);
  return null;
}

export async function saveBinaryFile(
  defaultName: string,
  data: Uint8Array | Blob,
  filter: { name: string; extensions: string[] },
): Promise<void> {
  const bytes = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
  if (window.handscript) {
    await window.handscript.saveFile(defaultName, bytes, [filter]);
    return;
  }
  downloadBlob(new Blob([bytes as BlobPart]), defaultName);
}

/** Crash-recovery autosave (localStorage in both browser and Electron). */
export function writeAutosave(project: ProjectFile): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
  } catch {
    // Storage full or unavailable — autosave is best-effort by design.
  }
}

export function readAutosave(): ProjectFile | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = safeParse(raw);
    return parsed.ok ? parsed.project : null;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    /* best-effort */
  }
}

export function recentProjects(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function rememberRecent(path: string): void {
  try {
    const list = [path, ...recentProjects().filter((p) => p !== path)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* best-effort */
  }
}

function safeParse(json: string): ReturnType<typeof parseProjectFile> {
  try {
    return parseProjectFile(JSON.parse(json));
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // `cancel` fires on modern browsers when the dialog is dismissed.
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
