import { describe, expect, it } from 'vitest';
import { DEFAULT_RENDER_CONFIG, type RenderConfig } from '@handscript/shared';
import { layoutDocument } from './layout.js';

const config = (overrides: Partial<RenderConfig> = {}): RenderConfig => ({
  ...structuredClone(DEFAULT_RENDER_CONFIG),
  ...overrides,
});

const SAMPLE =
  'The quick brown fox jumps over the lazy dog. ' +
  'Pack my box with five dozen liquor jugs. '.repeat(20);

describe('layoutDocument', () => {
  it('is deterministic for the same seed', () => {
    const a = layoutDocument(SAMPLE, config({ seed: 42 }));
    const b = layoutDocument(SAMPLE, config({ seed: 42 }));
    expect(a).toEqual(b);
  });

  it('produces different glyph placement for different seeds', () => {
    const a = layoutDocument(SAMPLE, config({ seed: 1 }));
    const b = layoutDocument(SAMPLE, config({ seed: 2 }));
    const ga = a.pages[0]!.lines[0]!.glyphs;
    const gb = b.pages[0]!.lines[0]!.glyphs;
    const differs = ga.some((g, i) => g.rotationDeg !== gb[i]?.rotationDeg);
    expect(differs).toBe(true);
  });

  it('never renders repeated characters identically', () => {
    const result = layoutDocument('lllllllll', config());
    const glyphs = result.pages[0]!.lines[0]!.glyphs;
    expect(glyphs.length).toBe(9);
    for (let i = 1; i < glyphs.length; i++) {
      const prev = glyphs[i - 1]!;
      const cur = glyphs[i]!;
      // Adjacent twins must differ in alternate AND in continuous jitter.
      expect(cur.alternate).not.toBe(prev.alternate);
      expect(
        cur.rotationDeg !== prev.rotationDeg || cur.scaleY !== prev.scaleY || cur.y !== prev.y,
      ).toBe(true);
    }
  });

  it('wraps words within the content width', () => {
    const result = layoutDocument(SAMPLE, config());
    const page = result.pages[0]!;
    const cfg = config();
    const rightEdge = cfg.page.width - cfg.page.margins.right;
    for (const line of page.lines) {
      for (const glyph of line.glyphs) {
        // Glyph origins stay inside the content box (a small tolerance covers
        // the deliberate margin-overflow behaviour of extra-long words).
        expect(glyph.x).toBeGreaterThanOrEqual(cfg.page.margins.left - 0.01);
        expect(glyph.x).toBeLessThanOrEqual(rightEdge + 15);
      }
    }
  });

  it('paginates long documents onto multiple pages', () => {
    const long = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(400);
    const result = layoutDocument(long, config());
    expect(result.pages.length).toBeGreaterThan(1);
    const cfg = config();
    for (const page of result.pages) {
      for (const line of page.lines) {
        expect(line.baselineY).toBeLessThanOrEqual(
          cfg.page.height - cfg.page.margins.bottom + 0.01,
        );
      }
    }
  });

  it('keeps line breaks stable when only randomness intensity changes', () => {
    const calm = layoutDocument(SAMPLE, config());
    const wildCfg = config();
    wildCfg.randomness = { ...wildCfg.randomness, intensity: 1 };
    const wild = layoutDocument(SAMPLE, wildCfg);
    expect(wild.pages.length).toBe(calm.pages.length);
    expect(wild.pages[0]!.lines.length).toBe(calm.pages[0]!.lines.length);
    expect(wild.pages[0]!.lines[0]!.glyphs.length).toBe(calm.pages[0]!.lines[0]!.glyphs.length);
  });

  it('handles empty input with a single empty page', () => {
    const result = layoutDocument('', config());
    expect(result.pages.length).toBe(1);
    expect(result.glyphCount).toBe(0);
  });

  it('snaps line height to the paper rules on ruled templates', () => {
    const cfg = config();
    cfg.paper = { ...cfg.paper, templateId: 'ruled', lineSpacing: 8 };
    const result = layoutDocument('one\ntwo\nthree', cfg);
    const lines = result.pages[0]!.lines;
    expect(lines.length).toBe(3);
    const delta1 = lines[1]!.baselineY - lines[0]!.baselineY;
    const delta2 = lines[2]!.baselineY - lines[1]!.baselineY;
    expect(delta1 % 8).toBeCloseTo(0, 5);
    expect(delta1).toBeCloseTo(delta2, 5);
  });
});
