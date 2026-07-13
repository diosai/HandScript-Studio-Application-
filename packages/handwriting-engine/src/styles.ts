import type { HandwritingStyle, HandwritingStyleId } from '@handscript/shared';

/**
 * Built-in handwriting style families.
 *
 * A style is a font stack plus a "personality": how big, how slanted, how
 * connected, and — most importantly — how much its glyphs naturally vary.
 * The variance amplitudes here are the style's own character; the user's
 * RandomnessProfile scales them up or down.
 *
 * Font stacks reference open-licence (OFL) handwriting fonts when installed
 * and always end in the generic `cursive` family, so rendering degrades
 * gracefully on machines without the optional font pack (see assets/fonts).
 */
const STYLES: Record<HandwritingStyleId, HandwritingStyle> = {
  print: {
    id: 'print',
    label: 'Print',
    description: 'Casual upright print handwriting with detached letters.',
    fontStack: ['Patrick Hand', 'Comic Neue', 'Segoe Print', 'cursive'],
    baseSizeMm: 4.2,
    slantDeg: 0.5,
    connected: false,
    alternatesPerChar: 4,
    variance: {
      rotationDeg: 2.2,
      baselineMm: 0.45,
      sizePct: 0.06,
      letterSpacingMm: 0.35,
      wordSpacingMm: 0.9,
      lineSpacingMm: 0.6,
      pressure: 0.25,
    },
  },
  cursive: {
    id: 'cursive',
    label: 'Cursive',
    description: 'Flowing connected script with a right slant.',
    fontStack: ['Dancing Script', 'Brush Script MT', 'Segoe Script', 'cursive'],
    baseSizeMm: 4.6,
    slantDeg: 7,
    connected: true,
    alternatesPerChar: 5,
    variance: {
      rotationDeg: 1.6,
      baselineMm: 0.55,
      sizePct: 0.08,
      letterSpacingMm: 0.2,
      wordSpacingMm: 1.1,
      lineSpacingMm: 0.8,
      pressure: 0.35,
    },
  },
  school: {
    id: 'school',
    label: 'School',
    description: 'Neat learner handwriting, rounded and evenly spaced.',
    fontStack: ['Schoolbell', 'Comic Neue', 'Comic Sans MS', 'cursive'],
    baseSizeMm: 4.8,
    slantDeg: 1,
    connected: false,
    alternatesPerChar: 3,
    variance: {
      rotationDeg: 1.4,
      baselineMm: 0.3,
      sizePct: 0.04,
      letterSpacingMm: 0.25,
      wordSpacingMm: 0.7,
      lineSpacingMm: 0.4,
      pressure: 0.15,
    },
  },
  elegant: {
    id: 'elegant',
    label: 'Elegant',
    description: 'Refined, narrow script with long ascenders.',
    fontStack: ['Great Vibes', 'Alex Brush', 'Segoe Script', 'cursive'],
    baseSizeMm: 5.2,
    slantDeg: 10,
    connected: true,
    alternatesPerChar: 4,
    variance: {
      rotationDeg: 1.2,
      baselineMm: 0.4,
      sizePct: 0.05,
      letterSpacingMm: 0.15,
      wordSpacingMm: 0.8,
      lineSpacingMm: 0.5,
      pressure: 0.4,
    },
  },
  calligraphy: {
    id: 'calligraphy',
    label: 'Calligraphy',
    description: 'Broad-nib calligraphic strokes with strong pressure contrast.',
    fontStack: ['Tangerine', 'Pinyon Script', 'cursive'],
    baseSizeMm: 5.8,
    slantDeg: 5,
    connected: true,
    alternatesPerChar: 4,
    variance: {
      rotationDeg: 1,
      baselineMm: 0.35,
      sizePct: 0.05,
      letterSpacingMm: 0.2,
      wordSpacingMm: 0.9,
      lineSpacingMm: 0.5,
      pressure: 0.55,
    },
  },
  technical: {
    id: 'technical',
    label: 'Technical',
    description: 'Engineer’s block lettering — upright, compact, all-caps feel.',
    fontStack: ['Architects Daughter', 'Shantell Sans', 'Segoe Print', 'cursive'],
    baseSizeMm: 3.8,
    slantDeg: 0,
    connected: false,
    alternatesPerChar: 3,
    variance: {
      rotationDeg: 1,
      baselineMm: 0.25,
      sizePct: 0.04,
      letterSpacingMm: 0.3,
      wordSpacingMm: 0.6,
      lineSpacingMm: 0.35,
      pressure: 0.2,
    },
  },
};

export function getStyle(id: HandwritingStyleId): HandwritingStyle {
  return STYLES[id];
}

export function listStyles(): HandwritingStyle[] {
  return Object.values(STYLES);
}
