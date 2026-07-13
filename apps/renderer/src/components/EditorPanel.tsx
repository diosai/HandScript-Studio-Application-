import { useMemo, useState } from 'react';
import type { ProjectDocument } from '@handscript/shared';
import { useStore } from '../state/store.js';

/** Text editor panel with title, find & replace and live word wrap. */
export function EditorPanel({ doc }: { doc: ProjectDocument }): JSX.Element {
  const setText = useStore((s) => s.setText);
  const setTitle = useStore((s) => s.setTitle);
  const findOpen = useStore((s) => s.ui.findOpen);
  const setUi = useStore((s) => s.setUi);

  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');

  const matchCount = useMemo(() => {
    if (!find) return 0;
    let count = 0;
    let index = doc.text.indexOf(find);
    while (index !== -1) {
      count += 1;
      index = doc.text.indexOf(find, index + find.length);
    }
    return count;
  }, [doc.text, find]);

  const replaceAll = (): void => {
    if (!find || matchCount === 0) return;
    setText(doc.text.split(find).join(replace));
  };

  return (
    <section className="panel panel-editor" aria-label="Text editor">
      <div className="panel-header">
        <span>Editor</span>
        <button
          className="btn"
          onClick={() => setUi({ findOpen: !findOpen })}
          aria-expanded={findOpen}
        >
          Find
        </button>
      </div>

      <input
        className="doc-title"
        value={doc.title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Document title"
        placeholder="Document title"
      />

      {findOpen && (
        <div className="findbar" role="search" aria-label="Find and replace">
          <input
            placeholder="Find"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            aria-label="Find text"
          />
          <input
            placeholder="Replace"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            aria-label="Replacement text"
          />
          <span className="count">{find ? `${matchCount} found` : ''}</span>
          <button className="btn" onClick={replaceAll} disabled={matchCount === 0}>
            Replace all
          </button>
          <button
            className="btn"
            onClick={() => setUi({ findOpen: false })}
            aria-label="Close find"
          >
            ×
          </button>
        </div>
      )}

      <textarea
        className="editor-textarea"
        value={doc.text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your text here — it becomes handwriting on the right. Markdown paragraphs and blank lines are respected."
        spellCheck
        aria-label="Document text"
      />
    </section>
  );
}
