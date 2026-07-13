/**
 * Document importers.
 *
 * Supported today: .txt, .md/.markdown, .html/.htm (tags stripped safely via
 * DOMParser — scripts are never executed because the parsed document is inert).
 * DOCX and PDF import are roadmap items; the importer reports a clear message
 * instead of silently producing garbage. Size is capped to protect the UI.
 */
const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB of text is ~2500 pages.

export interface ImportResult {
  ok: boolean;
  text: string;
  title: string;
  message?: string;
}

export async function importFile(file: File): Promise<ImportResult> {
  const title = file.name.replace(/\.[^.]+$/, '');
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, text: '', title, message: 'File is too large (limit 10 MB).' };
  }

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  switch (ext) {
    case 'txt':
    case 'md':
    case 'markdown':
      return { ok: true, text: normalise(await file.text()), title };
    case 'html':
    case 'htm':
      return { ok: true, text: htmlToText(await file.text()), title };
    case 'docx':
    case 'pdf':
      return {
        ok: false,
        text: '',
        title,
        message: `${ext.toUpperCase()} import is not available yet — save as .txt, .md or .html and import that instead.`,
      };
    default:
      return { ok: false, text: '', title, message: `Unsupported file type: .${ext}` };
  }
}

export const IMPORT_ACCEPT = '.txt,.md,.markdown,.html,.htm';

function htmlToText(html: string): string {
  // DOMParser produces an inert document: scripts do not run, resources do
  // not load. We only ever read textContent from it.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript').forEach((el) => el.remove());
  const blocks = doc.body.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,br,tr');
  blocks.forEach((el) => el.appendChild(doc.createTextNode('\n')));
  return normalise(doc.body.textContent ?? '');
}

function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
