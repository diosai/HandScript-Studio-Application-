import type { LayoutResult, ProjectDocument } from '@handscript/shared';
import { getStyle, getInk } from '@handscript/handwriting-engine';

/** Bottom status bar: counts, current style, save state. */
export function StatusBar({
  doc,
  layout,
  dirty,
}: {
  doc: ProjectDocument;
  layout: LayoutResult;
  dirty: boolean;
}): JSX.Element {
  const words = doc.text.trim() === '' ? 0 : doc.text.trim().split(/\s+/).length;
  const chars = doc.text.length;

  return (
    <footer className="statusbar" aria-label="Status bar">
      <span>{words.toLocaleString()} words</span>
      <span>{chars.toLocaleString()} characters</span>
      <span>
        {layout.pages.length} page{layout.pages.length === 1 ? '' : 's'}
      </span>
      <span className="spacer" />
      <span>
        {getStyle(doc.config.styleId).label} · {getInk(doc.config.inkId).label}
      </span>
      <span>Seed {doc.config.seed}</span>
      <span className={dirty ? 'dirty' : ''}>{dirty ? '● Unsaved changes' : 'Saved'}</span>
    </footer>
  );
}
