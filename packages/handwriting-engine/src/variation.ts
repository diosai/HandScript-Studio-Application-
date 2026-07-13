import type { HandwritingStyle, RandomnessProfile } from '@handscript/shared';
import { combineSeeds, createRng, fnv1a } from '@handscript/utils';

/**
 * Per-glyph variation — the piece that makes output look written, not typed.
 *
 * Every glyph instance gets its own RNG seeded from
 * (document seed, absolute character index, the character itself), so:
 *  - the same document + seed always renders identically (stable previews), and
 *  - two occurrences of the same letter get different seeds and therefore
 *    different rotation/size/baseline/alternate — repeated letters are never
 *    pixel-identical.
 */
export interface GlyphVariation {
  rotationDeg: number;
  baselineOffsetMm: number;
  scaleX: number;
  scaleY: number;
  /** Extra spacing after this glyph in mm (can be slightly negative). */
  letterSpacingDeltaMm: number;
  /** 0..1 simulated pen pressure. */
  pressure: number;
  /** Index of the procedural alternate glyph to use. */
  alternate: number;
}

export interface VariationContext {
  /** Document master seed. */
  seed: number;
  style: HandwritingStyle;
  randomness: RandomnessProfile;
}

/** Deterministic seed for one glyph occurrence. */
export function glyphSeed(seed: number, charIndex: number, char: string): number {
  return combineSeeds(seed, charIndex, fnv1a(char));
}

/**
 * Compute the variation for one glyph occurrence.
 *
 * @param charIndex   absolute index of the character in the document
 * @param prevAlternate alternate chosen for the immediately preceding occurrence
 *                      of the *same* character, so adjacent twins (e.g. "ll")
 *                      are forced to use different alternates.
 */
export function computeGlyphVariation(
  ctx: VariationContext,
  char: string,
  charIndex: number,
  prevAlternate: number | null,
): GlyphVariation {
  const { style, randomness } = ctx;
  const rng = createRng(glyphSeed(ctx.seed, charIndex, char));
  const master = randomness.intensity;
  const v = style.variance;

  // Slow "hand drift": a per-glyph wave so slant and baseline wander coherently
  // along a line instead of jittering glyph-by-glyph.
  const drift = Math.sin(charIndex * 0.31 + (ctx.seed % 97)) * 0.5;

  let alternate = rng.int(Math.max(1, style.alternatesPerChar));
  if (prevAlternate !== null && style.alternatesPerChar > 1 && alternate === prevAlternate) {
    alternate = (alternate + 1 + rng.int(style.alternatesPerChar - 1)) % style.alternatesPerChar;
  }

  const sizeJitter = 1 + rng.gaussian() * v.sizePct * randomness.characterSize * master;

  return {
    rotationDeg:
      style.slantDeg +
      rng.gaussian() * v.rotationDeg * randomness.characterAngle * master +
      drift * v.rotationDeg * 0.6 * master,
    baselineOffsetMm:
      rng.gaussian() * v.baselineMm * randomness.baseline * master +
      drift * v.baselineMm * 0.8 * master,
    scaleX: sizeJitter * (1 + rng.gaussian() * 0.02 * randomness.characterSize * master),
    scaleY: sizeJitter,
    letterSpacingDeltaMm:
      rng.gaussian() * v.letterSpacingMm * randomness.letterSpacing * master +
      rng.gaussian() * 0.1 * randomness.characterPosition * master,
    pressure: clamp01(0.7 + rng.gaussian() * v.pressure * 0.3),
    alternate,
  };
}

/** Deterministic word-spacing for the gap before word `wordIndex`. */
export function wordSpacingMm(
  ctx: VariationContext,
  baseSpaceMm: number,
  wordIndex: number,
  lineIndex: number,
): number {
  const rng = createRng(combineSeeds(ctx.seed, 0x50ace, wordIndex, lineIndex));
  const jitter =
    rng.gaussian() *
    ctx.style.variance.wordSpacingMm *
    ctx.randomness.wordSpacing *
    ctx.randomness.intensity;
  return Math.max(baseSpaceMm * 0.5, baseSpaceMm + jitter);
}

/** Deterministic extra line-spacing offset for line `lineIndex`. */
export function lineSpacingJitterMm(ctx: VariationContext, lineIndex: number): number {
  const rng = createRng(combineSeeds(ctx.seed, 0x11fe5, lineIndex));
  return (
    rng.gaussian() *
    ctx.style.variance.lineSpacingMm *
    ctx.randomness.lineSpacing *
    ctx.randomness.intensity
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
