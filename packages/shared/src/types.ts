/**
 * Core domain model of HandScript Studio.
 *
 * All dimensions are in millimetres unless a name says otherwise; rasterisation
 * converts to pixels at export time. Everything here is plain serialisable data
 * so it can cross the Electron IPC boundary and be stored in project files.
 */

/** Identifier of a built-in handwriting style family. */
export type HandwritingStyleId =
  'print' | 'cursive' | 'school' | 'elegant' | 'calligraphy' | 'technical';

/** Identifier of a built-in ink/pen preset. */
export type InkPresetId =
  | 'blue-ballpoint'
  | 'black-ballpoint'
  | 'red-ballpoint'
  | 'green-ballpoint'
  | 'pencil'
  | 'fountain-pen'
  | 'gel-pen';

/** Identifier of a built-in paper template. */
export type PaperTemplateId =
  | 'blank'
  | 'ruled'
  | 'college-ruled'
  | 'grid'
  | 'dot-grid'
  | 'engineering'
  | 'graph'
  | 'music-staff'
  | 'notebook'
  | 'legal'
  | 'custom';

export type PageSizeId = 'a4' | 'a5' | 'letter' | 'legal' | 'custom';

/**
 * How strongly each aspect of the handwriting is randomised.
 * All values are 0..1 multipliers applied to the style's own base variance,
 * so `0` produces perfectly regular writing and `1` very loose writing.
 */
export interface RandomnessProfile {
  characterPosition: number;
  characterAngle: number;
  characterSize: number;
  baseline: number;
  wordSpacing: number;
  letterSpacing: number;
  lineSpacing: number;
  /** Master multiplier applied on top of the individual channels. */
  intensity: number;
}

/** Visual parameters of a pen/ink, consumed by the SVG renderer. */
export interface InkConfig {
  id: InkPresetId;
  label: string;
  /** CSS colour of the ink at full pressure. */
  color: string;
  /** 0..1 base opacity (pencil is lighter than gel pen). */
  opacity: number;
  /** Base stroke width in mm added around glyph outlines to fake nib width. */
  strokeWidth: number;
  /** 0..1 amount of ink spread/bleed simulated with a blur. */
  spread: number;
  /** 0..1 pressure sensitivity: how much per-glyph pressure changes opacity/width. */
  pressureVariance: number;
  /** 0..1 roughness of the stroke edge (paper texture pulling ink). */
  texture: number;
  /** 0..1 probability-like factor for dry/faded strokes. */
  dryness: number;
}

/** A handwriting style: font stack + how glyphs vary and connect. */
export interface HandwritingStyle {
  id: HandwritingStyleId;
  label: string;
  description: string;
  /** Ordered font stack; first available font wins. Always ends in a generic family. */
  fontStack: string[];
  /** Base glyph height in mm for a 1.0 size factor. */
  baseSizeMm: number;
  /** Base slant in degrees (positive leans right). */
  slantDeg: number;
  /** Whether letters within a word should visually connect (cursive-like). */
  connected: boolean;
  /** Number of procedural alternates generated per character. */
  alternatesPerChar: number;
  /** Style-intrinsic variance amplitudes, scaled by the RandomnessProfile. */
  variance: {
    rotationDeg: number;
    baselineMm: number;
    sizePct: number;
    letterSpacingMm: number;
    wordSpacingMm: number;
    lineSpacingMm: number;
    pressure: number;
  };
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Paper template parameters (built-in templates fill these in). */
export interface PaperConfig {
  templateId: PaperTemplateId;
  /** Background paper colour. */
  backgroundColor: string;
  /** Rule/grid line colour. */
  lineColor: string;
  /** Rule/grid spacing in mm (where applicable). */
  lineSpacing: number;
  /** Whether to draw a left margin line (notebook/legal styles). */
  marginLine: boolean;
  /** Margin line colour. */
  marginLineColor: string;
  /** Whether to draw punch holes (notebook style). */
  punchHoles: boolean;
}

export interface PageSetup {
  sizeId: PageSizeId;
  /** Physical size in mm; derived from sizeId unless sizeId === 'custom'. */
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  margins: Margins;
  /** Extra spacing between paragraphs, in line-heights (0 = none). */
  paragraphSpacing: number;
  /** Line height as a multiple of the style's base size. */
  lineHeight: number;
  header: PageDecoration;
  footer: PageDecoration;
  pageNumbers: boolean;
}

export interface PageDecoration {
  enabled: boolean;
  text: string;
  align: 'left' | 'center' | 'right';
}

/** Everything needed to render a document deterministically. */
export interface RenderConfig {
  styleId: HandwritingStyleId;
  inkId: InkPresetId;
  paper: PaperConfig;
  page: PageSetup;
  randomness: RandomnessProfile;
  /** Master seed; changing it "rewrites" the whole document by hand. */
  seed: number;
  /** Glyph size multiplier applied to the style's base size. */
  sizeFactor: number;
}

/** A single positioned glyph produced by the layout engine. */
export interface GlyphInstance {
  char: string;
  /** Pen-down position of the glyph baseline origin, mm from page top-left. */
  x: number;
  y: number;
  rotationDeg: number;
  /** Horizontal/vertical scale around the origin. */
  scaleX: number;
  scaleY: number;
  /** 0..1 simulated pen pressure for this glyph. */
  pressure: number;
  /** Which procedural alternate of this character was chosen. */
  alternate: number;
}

export interface LayoutLine {
  glyphs: GlyphInstance[];
  /** Baseline y in mm. */
  baselineY: number;
}

export interface LayoutPage {
  lines: LayoutLine[];
  pageIndex: number;
}

export interface LayoutResult {
  pages: LayoutPage[];
  /** Total glyph count, for status displays. */
  glyphCount: number;
}
