import type { RenderConfig } from './types.js';
import { DEFAULT_RENDER_CONFIG } from './defaults.js';

/** Current project file format version. Bump on breaking schema changes. */
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXTENSION = '.hsproj';

/** One text document inside a project (projects are multi-tab). */
export interface ProjectDocument {
  id: string;
  title: string;
  /** Plain text / markdown source. */
  text: string;
  config: RenderConfig;
}

/** The on-disk project file — plain JSON, no executable content. */
export interface ProjectFile {
  version: number;
  app: 'handscript-studio';
  createdAt: string;
  updatedAt: string;
  documents: ProjectDocument[];
  activeDocumentId: string | null;
}

export function createEmptyDocument(id: string, title = 'Untitled'): ProjectDocument {
  return {
    id,
    title,
    text: '',
    config: structuredClone(DEFAULT_RENDER_CONFIG),
  };
}

export function createEmptyProject(now = new Date()): ProjectFile {
  const doc = createEmptyDocument('doc-1');
  return {
    version: PROJECT_FILE_VERSION,
    app: 'handscript-studio',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    documents: [doc],
    activeDocumentId: doc.id,
  };
}

/**
 * Validate untrusted JSON parsed from a project file.
 *
 * Project files may come from anywhere (email attachments, downloads), so this
 * must never assume the shape is correct, and must reject anything that is not
 * plain data. Returns a typed result instead of throwing so callers can show a
 * friendly error.
 */
export function parseProjectFile(
  data: unknown,
): { ok: true; project: ProjectFile } | { ok: false; error: string } {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'Project file is not a JSON object.' };
  }
  const obj = data as Record<string, unknown>;
  if (obj.app !== 'handscript-studio') {
    return { ok: false, error: 'Not a HandScript Studio project file.' };
  }
  if (typeof obj.version !== 'number' || obj.version > PROJECT_FILE_VERSION) {
    return { ok: false, error: `Unsupported project version: ${String(obj.version)}.` };
  }
  if (!Array.isArray(obj.documents) || obj.documents.length === 0) {
    return { ok: false, error: 'Project contains no documents.' };
  }

  const documents: ProjectDocument[] = [];
  for (const raw of obj.documents as unknown[]) {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, error: 'Corrupt document entry.' };
    }
    const d = raw as Record<string, unknown>;
    if (typeof d.id !== 'string' || typeof d.title !== 'string' || typeof d.text !== 'string') {
      return { ok: false, error: 'Corrupt document entry (id/title/text).' };
    }
    documents.push({
      id: d.id,
      title: d.title.slice(0, 200),
      text: d.text,
      // Unknown/missing config fields fall back to defaults; extra keys are dropped.
      config: sanitizeConfig(d.config),
    });
  }

  const activeId =
    typeof obj.activeDocumentId === 'string' && documents.some((d) => d.id === obj.activeDocumentId)
      ? (obj.activeDocumentId as string)
      : (documents[0]?.id ?? null);

  return {
    ok: true,
    project: {
      version: PROJECT_FILE_VERSION,
      app: 'handscript-studio',
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
      documents,
      activeDocumentId: activeId,
    },
  };
}

/** Merge an untrusted config object over the defaults, keeping only known keys. */
function sanitizeConfig(raw: unknown): RenderConfig {
  const base = structuredClone(DEFAULT_RENDER_CONFIG);
  if (typeof raw !== 'object' || raw === null) return base;
  const src = raw as Record<string, unknown>;

  const num = (v: unknown, fallback: number, min: number, max: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  const str = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  const color = (v: unknown, fallback: string): string =>
    typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback;

  base.styleId = str(
    src.styleId,
    ['print', 'cursive', 'school', 'elegant', 'calligraphy', 'technical'],
    base.styleId,
  );
  base.inkId = str(
    src.inkId,
    [
      'blue-ballpoint',
      'black-ballpoint',
      'red-ballpoint',
      'green-ballpoint',
      'pencil',
      'fountain-pen',
      'gel-pen',
    ],
    base.inkId,
  );
  base.seed = num(src.seed, base.seed, 0, 2 ** 32 - 1);
  base.sizeFactor = num(src.sizeFactor, base.sizeFactor, 0.4, 3);

  if (typeof src.randomness === 'object' && src.randomness !== null) {
    const r = src.randomness as Record<string, unknown>;
    for (const key of Object.keys(base.randomness) as (keyof RenderConfig['randomness'])[]) {
      base.randomness[key] = num(r[key], base.randomness[key], 0, 1);
    }
  }

  if (typeof src.paper === 'object' && src.paper !== null) {
    const p = src.paper as Record<string, unknown>;
    base.paper.templateId = str(
      p.templateId,
      [
        'blank',
        'ruled',
        'college-ruled',
        'grid',
        'dot-grid',
        'engineering',
        'graph',
        'music-staff',
        'notebook',
        'legal',
        'custom',
      ],
      base.paper.templateId,
    );
    base.paper.backgroundColor = color(p.backgroundColor, base.paper.backgroundColor);
    base.paper.lineColor = color(p.lineColor, base.paper.lineColor);
    base.paper.marginLineColor = color(p.marginLineColor, base.paper.marginLineColor);
    base.paper.lineSpacing = num(p.lineSpacing, base.paper.lineSpacing, 2, 40);
    base.paper.marginLine = p.marginLine === true;
    base.paper.punchHoles = p.punchHoles === true;
  }

  if (typeof src.page === 'object' && src.page !== null) {
    const g = src.page as Record<string, unknown>;
    base.page.sizeId = str(g.sizeId, ['a4', 'a5', 'letter', 'legal', 'custom'], base.page.sizeId);
    base.page.orientation = str(g.orientation, ['portrait', 'landscape'], base.page.orientation);
    base.page.width = num(g.width, base.page.width, 50, 1000);
    base.page.height = num(g.height, base.page.height, 50, 1000);
    base.page.lineHeight = num(g.lineHeight, base.page.lineHeight, 1, 4);
    base.page.paragraphSpacing = num(g.paragraphSpacing, base.page.paragraphSpacing, 0, 4);
    base.page.pageNumbers = g.pageNumbers === true;
    if (typeof g.margins === 'object' && g.margins !== null) {
      const m = g.margins as Record<string, unknown>;
      base.page.margins = {
        top: num(m.top, base.page.margins.top, 0, 100),
        right: num(m.right, base.page.margins.right, 0, 100),
        bottom: num(m.bottom, base.page.margins.bottom, 0, 100),
        left: num(m.left, base.page.margins.left, 0, 100),
      };
    }
    for (const side of ['header', 'footer'] as const) {
      const dec = g[side];
      if (typeof dec === 'object' && dec !== null) {
        const dd = dec as Record<string, unknown>;
        base.page[side] = {
          enabled: dd.enabled === true,
          text: typeof dd.text === 'string' ? dd.text.slice(0, 300) : '',
          align: str(dd.align, ['left', 'center', 'right'], 'center'),
        };
      }
    }
  }

  return base;
}
