import { describe, expect, it } from 'vitest';
import { DEFAULT_RENDER_CONFIG, type RenderConfig } from '@handscript/shared';
import { layoutDocument } from '@handscript/handwriting-engine';
import { renderDocumentSvgs, renderPageSvg } from './svg.js';

const config = (): RenderConfig => structuredClone(DEFAULT_RENDER_CONFIG);

describe('renderPageSvg', () => {
  it('produces a self-contained SVG document', () => {
    const layout = layoutDocument('Hello handwritten world', config());
    const svg = renderPageSvg(layout.pages[0]!, config());
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('data-layer="paper"');
    expect(svg).toContain('data-layer="writing"');
    expect(svg).toContain('feTurbulence');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('escapes XML-sensitive characters in user text', () => {
    const layout = layoutDocument('<script>&"\'', config());
    const svg = renderPageSvg(layout.pages[0]!, config());
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;');
    expect(svg).toContain('&amp;');
  });

  it('renders identical SVG for identical input (deterministic exports)', () => {
    const layout = layoutDocument('determinism', config());
    const a = renderPageSvg(layout.pages[0]!, config());
    const b = renderPageSvg(layout.pages[0]!, config());
    expect(a).toBe(b);
  });

  it('omits the paper layer for transparent exports', () => {
    const layout = layoutDocument('transparent', config());
    const svg = renderPageSvg(layout.pages[0]!, config(), { transparentBackground: true });
    expect(svg).not.toContain('data-layer="paper"');
    expect(svg).toContain('data-layer="writing"');
  });

  it('escapes header text and shows page numbers when enabled', () => {
    const cfg = config();
    cfg.page.header = { enabled: true, text: 'Notes <1>', align: 'left' };
    cfg.page.pageNumbers = true;
    const layout = layoutDocument('hello', cfg);
    const svg = renderPageSvg(layout.pages[0]!, cfg, { pageCount: 3 });
    expect(svg).toContain('Notes &lt;1&gt;');
    expect(svg).toContain('1 / 3');
  });
});

describe('renderDocumentSvgs', () => {
  it('renders one SVG per page', () => {
    const long = 'word '.repeat(6000);
    const layout = layoutDocument(long, config());
    const svgs = renderDocumentSvgs(layout.pages, config());
    expect(svgs.length).toBe(layout.pages.length);
    expect(svgs.length).toBeGreaterThan(1);
  });
});
