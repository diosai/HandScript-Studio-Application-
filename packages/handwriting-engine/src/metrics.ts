/**
 * Glyph advance-width metrics.
 *
 * Layout must work in pure Node (tests, CLI export) where no font measurement
 * API exists, so the engine depends on this small interface. The renderer app
 * supplies a canvas-measured implementation for pixel-accurate wrapping; the
 * `approximateMetrics` fallback uses a per-character width table tuned for
 * typical handwriting fonts.
 */
export interface GlyphMetricsProvider {
  /**
   * Horizontal advance of `char` in mm when rendered at `sizeMm`
   * (sizeMm is the nominal glyph height, i.e. the font size).
   */
  advanceWidth(char: string, sizeMm: number): number;
}

/** Width of each character relative to the font size (em-relative factors). */
const WIDTH_FACTORS: Record<string, number> = {
  i: 0.28,
  j: 0.28,
  l: 0.28,
  t: 0.34,
  f: 0.34,
  r: 0.38,
  ' ': 0.4,
  '.': 0.25,
  ',': 0.25,
  ';': 0.28,
  ':': 0.28,
  '!': 0.28,
  '|': 0.2,
  "'": 0.2,
  '"': 0.35,
  '(': 0.32,
  ')': 0.32,
  '[': 0.32,
  ']': 0.32,
  '-': 0.4,
  '–': 0.5,
  '—': 0.7,
  m: 0.85,
  w: 0.8,
  M: 0.95,
  W: 0.95,
  a: 0.52,
  b: 0.52,
  c: 0.46,
  d: 0.52,
  e: 0.5,
  g: 0.52,
  h: 0.52,
  k: 0.5,
  n: 0.54,
  o: 0.52,
  p: 0.52,
  q: 0.52,
  s: 0.44,
  u: 0.54,
  v: 0.48,
  x: 0.48,
  y: 0.48,
  z: 0.46,
  '0': 0.52,
  '1': 0.38,
  '2': 0.5,
  '3': 0.5,
  '4': 0.52,
  '5': 0.5,
  '6': 0.52,
  '7': 0.48,
  '8': 0.52,
  '9': 0.52,
};

const UPPER_DEFAULT = 0.68;
const DEFAULT_FACTOR = 0.52;

/** Table-based metrics used in Node and as the renderer's fallback. */
export const approximateMetrics: GlyphMetricsProvider = {
  advanceWidth(char: string, sizeMm: number): number {
    const known = WIDTH_FACTORS[char];
    if (known !== undefined) return known * sizeMm;
    if (char >= 'A' && char <= 'Z') return UPPER_DEFAULT * sizeMm;
    return DEFAULT_FACTOR * sizeMm;
  },
};
