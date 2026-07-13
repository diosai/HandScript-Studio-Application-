import { describe, expect, it } from 'vitest';
import {
  createEmptyProject,
  DEFAULT_RENDER_CONFIG,
  parseProjectFile,
  type RenderConfig,
} from '@handscript/shared';
import { layoutDocument } from '@handscript/handwriting-engine';
import { buildPdf, renderDocumentSvgs } from '@handscript/export-engine';
import { buildPrintHtml, DEFAULT_PRINT_OPTIONS } from '@handscript/print-engine';

const config = (): RenderConfig => structuredClone(DEFAULT_RENDER_CONFIG);

/** 1×1 red PNG. */
const TINY_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
);

describe('end-to-end pipeline (text → layout → SVG → PDF/print)', () => {
  it('renders a multi-page document to standalone SVGs', () => {
    const text = 'Dear diary, today the rain wrote its own story.\n\n' + 'word '.repeat(4000);
    const layout = layoutDocument(text, config());
    expect(layout.pages.length).toBeGreaterThan(1);

    const svgs = renderDocumentSvgs(layout.pages, config());
    expect(svgs.length).toBe(layout.pages.length);
    for (const svg of svgs) {
      expect(svg).toMatch(/^<svg /);
      expect(svg).toContain('data-layer="writing"');
    }
  });

  it('assembles rasterised pages into a valid multi-page PDF', async () => {
    const bytes = await buildPdf([
      { bytes: TINY_PNG, format: 'png', widthMm: 210, heightMm: 297 },
      { bytes: TINY_PNG, format: 'png', widthMm: 210, heightMm: 297 },
    ]);
    // %PDF header, and the document loads back with both pages intact.
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    const { PDFDocument } = await import('pdf-lib');
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(2);
    const size = reloaded.getPage(0).getSize();
    expect(size.width).toBeCloseTo((210 / 25.4) * 72, 0);
  });

  it('builds a print document from rendered pages', () => {
    const layout = layoutDocument('print me', config());
    const svgs = renderDocumentSvgs(layout.pages, config());
    const html = buildPrintHtml(
      { pageSvgs: svgs, pageWidthMm: 210, pageHeightMm: 297, title: 'Test' },
      DEFAULT_PRINT_OPTIONS,
    );
    expect(html).toContain('@page { size: 210mm 297mm;');
    expect(html).toContain('data-layer="writing"');
  });
});

describe('project file round-trip and validation', () => {
  it('round-trips a project through JSON', () => {
    const project = createEmptyProject();
    project.documents[0]!.text = 'Round trip ✓ with unicode — čćš 汉字';
    const parsed = parseProjectFile(JSON.parse(JSON.stringify(project)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.project.documents[0]!.text).toBe(project.documents[0]!.text);
    }
  });

  it('rejects files that are not HandScript projects', () => {
    expect(parseProjectFile({ app: 'other' }).ok).toBe(false);
    expect(parseProjectFile('nope').ok).toBe(false);
    expect(parseProjectFile(null).ok).toBe(false);
    expect(parseProjectFile({ app: 'handscript-studio', version: 999 }).ok).toBe(false);
  });

  it('sanitises hostile config values instead of trusting them', () => {
    const hostile = {
      app: 'handscript-studio',
      version: 1,
      documents: [
        {
          id: 'x',
          title: 'x',
          text: 'x',
          config: {
            styleId: '<script>',
            seed: Number.POSITIVE_INFINITY,
            sizeFactor: 9999,
            paper: { backgroundColor: 'url(javascript:alert(1))', lineSpacing: -5 },
            page: { margins: { top: 1e9 } },
          },
        },
      ],
    };
    const parsed = parseProjectFile(hostile);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const cfg = parsed.project.documents[0]!.config;
      expect(cfg.styleId).toBe(DEFAULT_RENDER_CONFIG.styleId);
      expect(Number.isFinite(cfg.seed)).toBe(true);
      expect(cfg.sizeFactor).toBeLessThanOrEqual(3);
      expect(cfg.paper.backgroundColor).toMatch(/^#/);
      expect(cfg.paper.lineSpacing).toBeGreaterThanOrEqual(2);
      expect(cfg.page.margins.top).toBeLessThanOrEqual(100);
    }
  });
});

describe('performance envelope', () => {
  it('lays out and renders a ~200-page document in reasonable time', () => {
    const text = 'The five boxing wizards jump quickly over the lazy handwriting engine. '.repeat(
      9000,
    );
    const started = performance.now();
    const layout = layoutDocument(text, config());
    const svgs = renderDocumentSvgs(layout.pages.slice(0, 3), config());
    const elapsed = performance.now() - started;

    expect(layout.pages.length).toBeGreaterThan(150);
    expect(svgs.length).toBe(3);
    // Generous CI budget; locally this is well under a second.
    expect(elapsed).toBeLessThan(10_000);
  });
});
