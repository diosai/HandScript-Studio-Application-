import { useStore } from '../state/store.js';

/** Multi-document tab strip. */
export function TabBar(): JSX.Element {
  const project = useStore((s) => s.project);
  const setActiveDocument = useStore((s) => s.setActiveDocument);
  const closeDocument = useStore((s) => s.closeDocument);
  const addDocument = useStore((s) => s.addDocument);

  return (
    <nav className="tabbar" role="tablist" aria-label="Open documents">
      {project.documents.map((doc) => {
        const active = doc.id === project.activeDocumentId;
        return (
          <div
            key={doc.id}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            className={`tab ${active ? 'active' : ''}`}
            onClick={() => setActiveDocument(doc.id)}
            onKeyDown={(e) => e.key === 'Enter' && setActiveDocument(doc.id)}
          >
            <span className="tab-label">{doc.title || 'Untitled'}</span>
            {project.documents.length > 1 && (
              <button
                className="close"
                aria-label={`Close ${doc.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeDocument(doc.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <button className="tab-add" onClick={addDocument} aria-label="New document tab">
        + New
      </button>
    </nav>
  );
}
