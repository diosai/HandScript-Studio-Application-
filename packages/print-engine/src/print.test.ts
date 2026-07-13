import { describe, expect, it } from 'vitest';
import { buildPrintHtml, DEFAULT_PRINT_OPTIONS } from './print.js';

describe('buildPrintHtml', () => {
  const job = {
    pageSvgs: ['<svg>1</svg>', '<svg>2</svg>'],
    pageWidthMm: 210,
    pageHeightMm: 297,
    title: 'My <notes>',
  };

  it('sets the @page size from the job', () => {
    const html = buildPrintHtml(job, DEFAULT_PRINT_OPTIONS);
    expect(html).toContain('@page { size: 210mm 297mm;');
  });

  it('emits one .page block per page with page breaks', () => {
    const html = buildPrintHtml(job, DEFAULT_PRINT_OPTIONS);
    expect((html.match(/class="page"/g) ?? []).length).toBe(2);
    expect(html).toContain('page-break-after: always');
  });

  it('escapes the document title', () => {
    const html = buildPrintHtml(job, DEFAULT_PRINT_OPTIONS);
    expect(html).toContain('My &lt;notes&gt;');
  });

  it('embeds font CSS in the print document head when provided', () => {
    const withFonts = {
      ...job,
      fontCss: "@font-face{font-family:'X';src:url(data:font/ttf;base64,AA);}",
    };
    const html = buildPrintHtml(withFonts, DEFAULT_PRINT_OPTIONS);
    expect(html).toContain("font-family:'X'");
    expect(buildPrintHtml(job, DEFAULT_PRINT_OPTIONS)).not.toContain('@font-face');
  });

  it('applies the scale option to page SVG sizing', () => {
    const html = buildPrintHtml(job, { ...DEFAULT_PRINT_OPTIONS, scale: 0.5 });
    expect(html).toContain('width: 105mm');
  });
});
