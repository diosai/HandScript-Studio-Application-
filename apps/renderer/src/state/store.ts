import { create } from 'zustand';
import {
  createEmptyDocument,
  createEmptyProject,
  type ProjectDocument,
  type ProjectFile,
  type RenderConfig,
} from '@handscript/shared';

/**
 * Application state (zustand).
 *
 * Undo/redo: every mutating action first pushes a snapshot of the affected
 * document onto `past`. Text edits within a short window coalesce into one
 * entry so undo works at "burst of typing" granularity rather than
 * per-keystroke. History depth is capped to keep memory bounded on huge
 * documents (the cap is configurable in settings).
 */
interface HistoryEntry {
  docId: string;
  text: string;
  config: RenderConfig;
  title: string;
  /** Timestamp used to coalesce rapid text edits. */
  at: number;
  coalesceKey: string | null;
}

export type ViewMode = 'continuous' | 'single' | 'two';
export type Theme = 'light' | 'dark';

export interface UiState {
  theme: Theme;
  zoom: number;
  viewMode: ViewMode;
  showSettings: boolean;
  showThumbnails: boolean;
  paletteOpen: boolean;
  findOpen: boolean;
  /** Page index for single/two-page view. */
  currentPage: number;
  highContrast: boolean;
  /** UI font scale for accessibility (1 = 100%). */
  uiScale: number;
  autosaveIntervalSec: number;
  historyLimit: number;
  exportDpi: number;
  exportTransparent: boolean;
}

export interface AppState {
  project: ProjectFile;
  projectPath: string | null;
  dirty: boolean;
  ui: UiState;
  past: HistoryEntry[];
  future: HistoryEntry[];

  activeDocument(): ProjectDocument;
  setText(text: string): void;
  setTitle(title: string): void;
  updateConfig(mutate: (config: RenderConfig) => void, coalesceKey?: string): void;
  addDocument(): void;
  closeDocument(id: string): void;
  setActiveDocument(id: string): void;
  undo(): void;
  redo(): void;
  loadProject(project: ProjectFile, path: string | null): void;
  newProject(): void;
  markSaved(path: string | null): void;
  setUi(patch: Partial<UiState>): void;
}

const COALESCE_MS = 900;

function snapshotOf(doc: ProjectDocument, coalesceKey: string | null): HistoryEntry {
  return {
    docId: doc.id,
    text: doc.text,
    config: structuredClone(doc.config),
    title: doc.title,
    at: Date.now(),
    coalesceKey,
  };
}

let docCounter = 1;

export const useStore = create<AppState>((set, get) => {
  const withHistory = (
    coalesceKey: string | null,
    mutate: (project: ProjectFile) => void,
  ): void => {
    const state = get();
    const doc = state.activeDocument();
    const last = state.past[state.past.length - 1];
    const coalesce =
      coalesceKey !== null &&
      last !== undefined &&
      last.docId === doc.id &&
      last.coalesceKey === coalesceKey &&
      Date.now() - last.at < COALESCE_MS;

    const project = structuredClone(state.project);
    mutate(project);
    project.updatedAt = new Date().toISOString();

    const past = coalesce ? [...state.past] : [...state.past, snapshotOf(doc, coalesceKey)];
    if (last !== undefined && coalesce) {
      // Refresh the timestamp so a long typing burst keeps coalescing.
      past[past.length - 1] = { ...last, at: Date.now() };
    }
    while (past.length > state.ui.historyLimit) past.shift();

    set({ project, past, future: [], dirty: true });
  };

  return {
    project: createEmptyProject(),
    projectPath: null,
    dirty: false,
    ui: {
      theme: 'light',
      zoom: 0.75,
      viewMode: 'continuous',
      showSettings: true,
      showThumbnails: true,
      paletteOpen: false,
      findOpen: false,
      currentPage: 0,
      highContrast: false,
      uiScale: 1,
      autosaveIntervalSec: 30,
      historyLimit: 500,
      exportDpi: 300,
      exportTransparent: false,
    },
    past: [],
    future: [],

    activeDocument() {
      const { project } = get();
      const doc =
        project.documents.find((d) => d.id === project.activeDocumentId) ?? project.documents[0];
      if (!doc) throw new Error('Project has no documents.');
      return doc;
    },

    setText(text) {
      const id = get().project.activeDocumentId;
      withHistory('text', (project) => {
        const doc = project.documents.find((d) => d.id === id);
        if (doc) doc.text = text;
      });
    },

    setTitle(title) {
      const id = get().project.activeDocumentId;
      withHistory('title', (project) => {
        const doc = project.documents.find((d) => d.id === id);
        if (doc) doc.title = title;
      });
    },

    updateConfig(mutate, coalesceKey) {
      const id = get().project.activeDocumentId;
      withHistory(coalesceKey ?? null, (project) => {
        const doc = project.documents.find((d) => d.id === id);
        if (doc) mutate(doc.config);
      });
    },

    addDocument() {
      const state = get();
      docCounter += 1;
      const doc = createEmptyDocument(`doc-${Date.now()}-${docCounter}`, `Untitled ${docCounter}`);
      const project = structuredClone(state.project);
      project.documents.push(doc);
      project.activeDocumentId = doc.id;
      set({ project, dirty: true });
    },

    closeDocument(id) {
      const state = get();
      if (state.project.documents.length <= 1) return;
      const project = structuredClone(state.project);
      project.documents = project.documents.filter((d) => d.id !== id);
      if (project.activeDocumentId === id) {
        project.activeDocumentId = project.documents[0]?.id ?? null;
      }
      set({
        project,
        dirty: true,
        past: state.past.filter((h) => h.docId !== id),
        future: state.future.filter((h) => h.docId !== id),
      });
    },

    setActiveDocument(id) {
      const state = get();
      if (!state.project.documents.some((d) => d.id === id)) return;
      const project = structuredClone(state.project);
      project.activeDocumentId = id;
      set({ project, ui: { ...state.ui, currentPage: 0 } });
    },

    undo() {
      const state = get();
      const entry = state.past[state.past.length - 1];
      if (!entry) return;
      const project = structuredClone(state.project);
      const doc = project.documents.find((d) => d.id === entry.docId);
      if (!doc) {
        set({ past: state.past.slice(0, -1) });
        return;
      }
      const redoEntry = snapshotOf(doc, null);
      doc.text = entry.text;
      doc.config = structuredClone(entry.config);
      doc.title = entry.title;
      project.activeDocumentId = entry.docId;
      set({
        project,
        past: state.past.slice(0, -1),
        future: [...state.future, redoEntry],
        dirty: true,
      });
    },

    redo() {
      const state = get();
      const entry = state.future[state.future.length - 1];
      if (!entry) return;
      const project = structuredClone(state.project);
      const doc = project.documents.find((d) => d.id === entry.docId);
      if (!doc) {
        set({ future: state.future.slice(0, -1) });
        return;
      }
      const undoEntry = snapshotOf(doc, null);
      doc.text = entry.text;
      doc.config = structuredClone(entry.config);
      doc.title = entry.title;
      project.activeDocumentId = entry.docId;
      set({
        project,
        future: state.future.slice(0, -1),
        past: [...state.past, undoEntry],
        dirty: true,
      });
    },

    loadProject(project, path) {
      set({ project, projectPath: path, dirty: false, past: [], future: [] });
    },

    newProject() {
      set({ project: createEmptyProject(), projectPath: null, dirty: false, past: [], future: [] });
    },

    markSaved(path) {
      set({ dirty: false, projectPath: path ?? get().projectPath });
    },

    setUi(patch) {
      set({ ui: { ...get().ui, ...patch } });
    },
  };
});
