import type { LayoutResult, ProjectDocument } from '@handscript/shared';
import { ZOOM_LEVELS, resolvePageSize } from '@handscript/shared';
import { renderDocumentSvgs } from '@handscript/export-engine';
import {
  browserPrintAdapter,
  buildPrintHtml,
  DEFAULT_PRINT_OPTIONS,
} from '@handscript/print-engine';
import { useStore } from './state/store.js';
import { exportPdf, exportRaster, exportSvg } from './services/exporter.js';
import { clearAutosave, openProjectDialog, saveProjectDialog } from './services/platform.js';
import { IMPORT_ACCEPT, importFile } from './services/importers.js';

/**
 * Central command registry. Every user-facing action is a Command so the
 * toolbar, command palette and keyboard shortcuts all share one definition
 * (single source of truth for behaviour, labels and keybindings).
 */
export interface Command {
  id: string;
  title: string;
  /** Human-readable shortcut hint, e.g. "Ctrl+S". */
  shortcut?: string;
  /** Normalised key combo for the shortcut handler, e.g. "ctrl+s". */
  combo?: string;
  run: () => void | Promise<void>;
}

export interface CommandContext {
  layout: LayoutResult;
  doc: ProjectDocument;
  showToast: (text: string, kind?: 'info' | 'error') => void;
}

export function buildCommands(ctx: CommandContext): Command[] {
  const store = useStore.getState;
  const { layout, doc, showToast } = ctx;

  const guard = (fn: () => Promise<void>) => async (): Promise<void> => {
    try {
      await fn();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Something went wrong.', 'error');
    }
  };

  const exportSettings = (): { dpi: number; transparent: boolean } => ({
    dpi: store().ui.exportDpi,
    transparent: store().ui.exportTransparent,
  });

  return [
    {
      id: 'project.new',
      title: 'Project: New project',
      shortcut: 'Ctrl+Shift+N',
      combo: 'ctrl+shift+n',
      run: () => {
        if (!store().dirty || window.confirm('Discard unsaved changes?')) {
          store().newProject();
        }
      },
    },
    {
      id: 'project.open',
      title: 'Project: Open…',
      shortcut: 'Ctrl+O',
      combo: 'ctrl+o',
      run: guard(async () => {
        const result = await openProjectDialog();
        if (result) {
          store().loadProject(result.project, result.path);
          showToast('Project opened.');
        }
      }),
    },
    {
      id: 'project.save',
      title: 'Project: Save',
      shortcut: 'Ctrl+S',
      combo: 'ctrl+s',
      run: guard(async () => {
        const path = await saveProjectDialog(store().project, store().projectPath);
        store().markSaved(path);
        clearAutosave();
        showToast('Project saved.');
      }),
    },
    {
      id: 'doc.new',
      title: 'Document: New tab',
      shortcut: 'Ctrl+N',
      combo: 'ctrl+n',
      run: () => store().addDocument(),
    },
    {
      id: 'doc.close',
      title: 'Document: Close tab',
      shortcut: 'Ctrl+W',
      combo: 'ctrl+w',
      run: () => store().closeDocument(doc.id),
    },
    {
      id: 'doc.import',
      title: 'Document: Import file (txt, md, html)…',
      shortcut: 'Ctrl+I',
      combo: 'ctrl+i',
      run: guard(async () => {
        const file = await pickImportFile();
        if (!file) return;
        const result = await importFile(file);
        if (!result.ok) {
          showToast(result.message ?? 'Import failed.', 'error');
          return;
        }
        store().setText(result.text);
        store().setTitle(result.title);
        showToast(`Imported ${file.name}.`);
      }),
    },
    {
      id: 'edit.undo',
      title: 'Edit: Undo',
      shortcut: 'Ctrl+Z',
      combo: 'ctrl+z',
      run: () => store().undo(),
    },
    {
      id: 'edit.redo',
      title: 'Edit: Redo',
      shortcut: 'Ctrl+Shift+Z',
      combo: 'ctrl+shift+z',
      run: () => store().redo(),
    },
    {
      id: 'edit.find',
      title: 'Edit: Find & replace',
      shortcut: 'Ctrl+F',
      combo: 'ctrl+f',
      run: () => store().setUi({ findOpen: !store().ui.findOpen }),
    },
    {
      id: 'style.reroll',
      title: 'Handwriting: Re-roll randomness (new seed)',
      shortcut: 'Ctrl+R',
      combo: 'ctrl+r',
      run: () =>
        store().updateConfig((config) => {
          config.seed = Math.floor(Math.random() * 2 ** 31);
        }),
    },
    {
      id: 'export.pdf',
      title: 'Export: PDF (all pages)',
      shortcut: 'Ctrl+E',
      combo: 'ctrl+e',
      run: guard(() => exportPdf(layout, doc.config, doc.title, exportSettings())),
    },
    {
      id: 'export.png',
      title: 'Export: PNG (current page)',
      run: guard(() =>
        exportRaster(
          layout,
          doc.config,
          store().ui.currentPage,
          doc.title,
          'png',
          exportSettings(),
        ),
      ),
    },
    {
      id: 'export.jpg',
      title: 'Export: JPG (current page)',
      run: guard(() =>
        exportRaster(
          layout,
          doc.config,
          store().ui.currentPage,
          doc.title,
          'jpeg',
          exportSettings(),
        ),
      ),
    },
    {
      id: 'export.svg',
      title: 'Export: SVG (current page)',
      run: guard(() =>
        exportSvg(layout, doc.config, store().ui.currentPage, doc.title, exportSettings()),
      ),
    },
    {
      id: 'print',
      title: 'Print…',
      shortcut: 'Ctrl+P',
      combo: 'ctrl+p',
      run: guard(async () => {
        const size = resolvePageSize(doc.config.page.sizeId, doc.config.page.orientation, {
          width: doc.config.page.width,
          height: doc.config.page.height,
        });
        const svgs = renderDocumentSvgs(layout.pages, doc.config);
        const job = {
          pageSvgs: svgs,
          pageWidthMm: size.width,
          pageHeightMm: size.height,
          title: doc.title,
        };
        if (window.handscript) {
          await window.handscript.printHtml(buildPrintHtml(job, DEFAULT_PRINT_OPTIONS), {
            landscape: doc.config.page.orientation === 'landscape',
          });
        } else {
          await browserPrintAdapter.print(job, DEFAULT_PRINT_OPTIONS);
        }
      }),
    },
    {
      id: 'view.theme',
      title: 'View: Toggle dark mode',
      shortcut: 'Ctrl+Shift+D',
      combo: 'ctrl+shift+d',
      run: () => store().setUi({ theme: store().ui.theme === 'dark' ? 'light' : 'dark' }),
    },
    {
      id: 'view.settings',
      title: 'View: Toggle settings panel',
      combo: 'ctrl+,',
      shortcut: 'Ctrl+,',
      run: () => store().setUi({ showSettings: !store().ui.showSettings }),
    },
    {
      id: 'view.thumbnails',
      title: 'View: Toggle page thumbnails',
      run: () => store().setUi({ showThumbnails: !store().ui.showThumbnails }),
    },
    {
      id: 'view.zoomIn',
      title: 'View: Zoom in',
      shortcut: 'Ctrl+=',
      combo: 'ctrl+=',
      run: () => store().setUi({ zoom: nextZoom(store().ui.zoom, 1) }),
    },
    {
      id: 'view.zoomOut',
      title: 'View: Zoom out',
      shortcut: 'Ctrl+-',
      combo: 'ctrl+-',
      run: () => store().setUi({ zoom: nextZoom(store().ui.zoom, -1) }),
    },
    {
      id: 'palette.toggle',
      title: 'Command palette',
      shortcut: 'Ctrl+K',
      combo: 'ctrl+k',
      run: () => store().setUi({ paletteOpen: !store().ui.paletteOpen }),
    },
  ];
}

function nextZoom(current: number, direction: 1 | -1): number {
  const index = ZOOM_LEVELS.findIndex((z) => Math.abs(z - current) < 0.01);
  const next = index === -1 ? (direction === 1 ? ZOOM_LEVELS.length - 1 : 0) : index + direction;
  return ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, Math.max(0, next))] ?? current;
}

function pickImportFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = IMPORT_ACCEPT;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
