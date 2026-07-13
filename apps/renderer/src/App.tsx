import { useCallback, useEffect, useMemo, useState } from 'react';
import { layoutDocument } from '@handscript/handwriting-engine';
import { getStyle } from '@handscript/handwriting-engine';
import { useStore } from './state/store.js';
import { createCanvasMetrics } from './services/metrics.js';
import { Toolbar } from './components/Toolbar.js';
import { TabBar } from './components/TabBar.js';
import { EditorPanel } from './components/EditorPanel.js';
import { PreviewPanel } from './components/PreviewPanel.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { StatusBar } from './components/StatusBar.js';
import { CommandPalette } from './components/CommandPalette.js';
import { buildCommands, type CommandContext } from './commands.js';
import { useShortcuts } from './hooks/useShortcuts.js';
import { clearAutosave, readAutosave, writeAutosave } from './services/platform.js';

export interface Toast {
  text: string;
  kind: 'info' | 'error';
}

export function App(): JSX.Element {
  const project = useStore((s) => s.project);
  const ui = useStore((s) => s.ui);
  const dirty = useStore((s) => s.dirty);
  const activeDoc =
    project.documents.find((d) => d.id === project.activeDocumentId) ?? project.documents[0]!;

  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    setToast({ text, kind });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  // Layout is the single expensive derived value; memoised on exactly the
  // inputs that affect it. Canvas metrics are cached per font stack.
  const metrics = useMemo(
    () => createCanvasMetrics(getStyle(activeDoc.config.styleId).fontStack),
    [activeDoc.config.styleId],
  );
  const layout = useMemo(
    () => layoutDocument(activeDoc.text, activeDoc.config, metrics),
    [activeDoc.text, activeDoc.config, metrics],
  );

  // Theme / accessibility attributes.
  useEffect(() => {
    document.documentElement.dataset.theme = ui.theme;
    document.documentElement.dataset.contrast = ui.highContrast ? 'high' : 'normal';
    document.documentElement.style.setProperty('--ui-scale', String(ui.uiScale));
  }, [ui.theme, ui.highContrast, ui.uiScale]);

  // Crash-recovery: offer the autosaved project once on startup.
  useEffect(() => {
    const saved = readAutosave();
    if (saved && saved.documents.some((d) => d.text.trim() !== '')) {
      if (window.confirm('Recover your unsaved work from the last session?')) {
        useStore.getState().loadProject(saved, null);
      } else {
        clearAutosave();
      }
    }
  }, []); // deliberately runs once on mount

  // Periodic autosave of the whole project.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = useStore.getState();
      if (state.dirty) writeAutosave(state.project);
    }, ui.autosaveIntervalSec * 1000);
    return () => window.clearInterval(timer);
  }, [ui.autosaveIntervalSec]);

  // Warn before closing with unsaved changes (browser mode).
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent): void => {
      if (useStore.getState().dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const commandContext: CommandContext = useMemo(
    () => ({ layout, doc: activeDoc, showToast }),
    [layout, activeDoc, showToast],
  );
  const commands = useMemo(() => buildCommands(commandContext), [commandContext]);
  useShortcuts(commands);

  return (
    <div className="shell">
      <Toolbar commands={commands} />
      <TabBar />
      <div className="shell-main">
        <EditorPanel doc={activeDoc} />
        <PreviewPanel layout={layout} config={activeDoc.config} />
        {ui.showSettings && <SettingsPanel doc={activeDoc} />}
      </div>
      <StatusBar doc={activeDoc} layout={layout} dirty={dirty} />
      {ui.paletteOpen && <CommandPalette commands={commands} />}
      {toast && (
        <div role="status" className={`toast ${toast.kind === 'error' ? 'error' : ''}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
