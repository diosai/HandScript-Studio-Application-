import { describe, expect, it } from 'vitest';
import { DEFAULT_RANDOMNESS } from '@handscript/shared';
import { getStyle } from './styles.js';
import { computeGlyphVariation, type VariationContext } from './variation.js';

const ctx = (seed = 7): VariationContext => ({
  seed,
  style: getStyle('print'),
  randomness: { ...DEFAULT_RANDOMNESS },
});

describe('computeGlyphVariation', () => {
  it('is deterministic per (seed, index, char)', () => {
    const a = computeGlyphVariation(ctx(), 'e', 10, null);
    const b = computeGlyphVariation(ctx(), 'e', 10, null);
    expect(a).toEqual(b);
  });

  it('differs across occurrences of the same character', () => {
    const a = computeGlyphVariation(ctx(), 'e', 10, null);
    const b = computeGlyphVariation(ctx(), 'e', 11, null);
    expect(a).not.toEqual(b);
  });

  it('never repeats the alternate of an adjacent identical character', () => {
    for (let i = 0; i < 200; i++) {
      const prev = computeGlyphVariation(ctx(i), 'l', i, null);
      const next = computeGlyphVariation(ctx(i), 'l', i + 1, prev.alternate);
      expect(next.alternate).not.toBe(prev.alternate);
    }
  });

  it('produces no variation when randomness is zeroed', () => {
    const zero: VariationContext = {
      seed: 1,
      style: getStyle('print'),
      randomness: {
        characterPosition: 0,
        characterAngle: 0,
        characterSize: 0,
        baseline: 0,
        wordSpacing: 0,
        letterSpacing: 0,
        lineSpacing: 0,
        intensity: 0,
      },
    };
    const v = computeGlyphVariation(zero, 'a', 5, null);
    expect(v.rotationDeg).toBeCloseTo(getStyle('print').slantDeg, 6);
    expect(v.baselineOffsetMm).toBeCloseTo(0, 6);
    expect(v.scaleX).toBeCloseTo(1, 6);
    expect(v.scaleY).toBeCloseTo(1, 6);
  });

  it('keeps pressure within [0, 1]', () => {
    for (let i = 0; i < 500; i++) {
      const v = computeGlyphVariation(ctx(i), 'g', i, null);
      expect(v.pressure).toBeGreaterThanOrEqual(0);
      expect(v.pressure).toBeLessThanOrEqual(1);
    }
  });
});
