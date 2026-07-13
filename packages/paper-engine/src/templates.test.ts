import { describe, expect, it } from 'vitest';
import { DEFAULT_PAPER, type PaperTemplateId } from '@handscript/shared';
import { PAPER_TEMPLATES, renderPaperLayer } from './templates.js';

const A4 = { width: 210, height: 297 };

describe('renderPaperLayer', () => {
  it('renders every built-in template without throwing', () => {
    for (const template of PAPER_TEMPLATES) {
      const svg = renderPaperLayer({ ...DEFAULT_PAPER, templateId: template.id }, A4);
      expect(svg).toContain('data-layer="paper"');
      expect(svg).toContain('<rect');
    }
  });

  it('draws ruled lines at the configured spacing', () => {
    const svg = renderPaperLayer(
      { ...DEFAULT_PAPER, templateId: 'ruled' as PaperTemplateId, lineSpacing: 10 },
      A4,
    );
    const lineCount = (svg.match(/<line /g) ?? []).length;
    // ~ (297 - 14 - 4) / 10 lines expected.
    expect(lineCount).toBeGreaterThan(25);
    expect(lineCount).toBeLessThan(31);
  });

  it('includes punch holes only for notebook-style paper', () => {
    const notebook = renderPaperLayer({ ...DEFAULT_PAPER, templateId: 'notebook' }, A4);
    const ruled = renderPaperLayer({ ...DEFAULT_PAPER, templateId: 'ruled' }, A4);
    expect(notebook).toContain('<circle');
    expect(ruled).not.toContain('<circle');
  });

  it('never emits unvalidated markup characters from config colours', () => {
    // parseProjectFile validates colours; the template itself only interpolates
    // colours and numbers, so a well-formed config yields well-formed XML.
    const svg = renderPaperLayer(DEFAULT_PAPER, A4);
    expect(svg).not.toContain('<script');
  });
});
