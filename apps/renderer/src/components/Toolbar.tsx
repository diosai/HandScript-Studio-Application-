import type { Command } from '../commands.js';
import { useStore } from '../state/store.js';

/** Top toolbar. Buttons delegate to the shared command registry. */
export function Toolbar({ commands }: { commands: Command[] }): JSX.Element {
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);

  const run = (id: string): (() => void) => {
    const command = commands.find((c) => c.id === id);
    return () => void command?.run();
  };

  return (
    <header className="toolbar" role="toolbar" aria-label="Main toolbar">
      <div className="brand">
        Hand<span>Script</span> Studio
      </div>

      <div className="toolbar-group">
        <button className="btn" onClick={run('project.new')} title="New project (Ctrl+Shift+N)">
          New
        </button>
        <button className="btn" onClick={run('project.open')} title="Open project (Ctrl+O)">
          Open
        </button>
        <button className="btn" onClick={run('project.save')} title="Save project (Ctrl+S)">
          Save
        </button>
        <button className="btn" onClick={run('doc.import')} title="Import text file (Ctrl+I)">
          Import
        </button>
      </div>

      <div className="toolbar-group">
        <button
          className="btn"
          onClick={run('edit.undo')}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          className="btn"
          onClick={run('edit.redo')}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
        <button className="btn" onClick={run('style.reroll')} title="Re-roll handwriting (Ctrl+R)">
          Re-roll
        </button>
      </div>

      <div className="toolbar-group">
        <button className="btn primary" onClick={run('export.pdf')} title="Export PDF (Ctrl+E)">
          Export PDF
        </button>
        <button className="btn" onClick={run('export.png')}>
          PNG
        </button>
        <button className="btn" onClick={run('export.jpg')}>
          JPG
        </button>
        <button className="btn" onClick={run('export.svg')}>
          SVG
        </button>
        <button className="btn" onClick={run('print')} title="Print (Ctrl+P)">
          Print
        </button>
      </div>

      <div className="spacer" />

      <div className="toolbar-group" aria-label="View mode">
        {(
          [
            ['continuous', 'Scroll'],
            ['single', '1 page'],
            ['two', '2 pages'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            className={`btn ${ui.viewMode === mode ? 'active' : ''}`}
            onClick={() => setUi({ viewMode: mode })}
            aria-pressed={ui.viewMode === mode}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button
          className={`btn ${ui.showThumbnails ? 'active' : ''}`}
          onClick={run('view.thumbnails')}
          aria-pressed={ui.showThumbnails}
        >
          Thumbs
        </button>
        <button
          className={`btn ${ui.showSettings ? 'active' : ''}`}
          onClick={run('view.settings')}
          aria-pressed={ui.showSettings}
          title="Toggle settings (Ctrl+,)"
        >
          Settings
        </button>
        <button className="btn" onClick={run('view.theme')} title="Toggle theme (Ctrl+Shift+D)">
          {ui.theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        <button className="btn" onClick={run('palette.toggle')} title="Command palette (Ctrl+K)">
          <kbd>Ctrl K</kbd>
        </button>
      </div>
    </header>
  );
}
