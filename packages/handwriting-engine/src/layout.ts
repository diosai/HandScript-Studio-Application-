import type {
  GlyphInstance,
  LayoutLine,
  LayoutPage,
  LayoutResult,
  RenderConfig,
} from '@handscript/shared';
import { resolvePageSize } from '@handscript/shared';
import { getStyle } from './styles.js';
import { approximateMetrics, type GlyphMetricsProvider } from './metrics.js';
import {
  computeGlyphVariation,
  lineSpacingJitterMm,
  wordSpacingMm,
  type VariationContext,
} from './variation.js';

/** Paper templates whose horizontal rules the writing should sit on. */
const RULED_TEMPLATES = new Set(['ruled', 'college-ruled', 'notebook', 'legal']);

interface Word {
  chars: string[];
  /** Absolute index of each character in the source text (drives glyph seeds). */
  charIndexes: number[];
  widthMm: number;
}

/**
 * Lay out a document: text → wrapped lines → pages of positioned glyphs.
 *
 * The algorithm is deliberately two-phase:
 *  1. wrap words using *base* advance widths (no jitter), so line breaks are
 *     stable under randomness changes that only affect appearance;
 *  2. place each glyph with its deterministic per-glyph variation.
 *
 * Complexity is O(characters); a 500-page document is a few hundred thousand
 * plain objects and lays out in well under a second on desktop hardware.
 */
export function layoutDocument(
  text: string,
  config: RenderConfig,
  metrics: GlyphMetricsProvider = approximateMetrics,
): LayoutResult {
  const style = getStyle(config.styleId);
  const sizeMm = style.baseSizeMm * config.sizeFactor;
  const page = config.page;
  const pageSize = resolvePageSize(page.sizeId, page.orientation, {
    width: page.width,
    height: page.height,
  });

  const contentLeft = page.margins.left;
  const contentRight = pageSize.width - page.margins.right;
  const contentWidth = Math.max(10, contentRight - contentLeft);
  const contentTop = page.margins.top;
  const contentBottom = pageSize.height - page.margins.bottom;

  // On ruled paper the writing sits on the printed rules; otherwise the line
  // height derives from the glyph size and the user's line-height multiple.
  const onRules = RULED_TEMPLATES.has(config.paper.templateId);
  const baseLineHeight = onRules
    ? config.paper.lineSpacing * Math.max(1, Math.ceil((sizeMm * 1.15) / config.paper.lineSpacing))
    : sizeMm * page.lineHeight;

  const ctx: VariationContext = { seed: config.seed, style, randomness: config.randomness };
  const letterSpacingBase = style.connected ? -0.1 : 0.15;

  const paragraphs = splitParagraphs(text);
  const pages: LayoutPage[] = [];
  let currentPage: LayoutPage = { lines: [], pageIndex: 0 };
  let baselineY = contentTop + baseLineHeight;
  let lineIndex = 0;
  let glyphCount = 0;

  const pushPage = (): void => {
    pages.push(currentPage);
    currentPage = { lines: [], pageIndex: pages.length };
    baselineY = contentTop + baseLineHeight;
  };

  const advanceLine = (extraFactor = 1): void => {
    const jitter = onRules ? 0 : lineSpacingJitterMm(ctx, lineIndex);
    let advance = baseLineHeight * extraFactor + jitter;
    if (onRules) {
      // Writing on ruled paper always moves to the next rule: quantise every
      // advance (including fractional paragraph spacing) to whole rules.
      const rule = config.paper.lineSpacing;
      advance = Math.max(rule, Math.ceil(advance / rule - 1e-6) * rule);
    }
    baselineY += advance;
    lineIndex += 1;
    if (baselineY > contentBottom) pushPage();
  };

  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p] as { text: string; offset: number };
    const words = tokenize(paragraph.text, paragraph.offset, sizeMm, metrics);

    if (words.length === 0) {
      // Blank line in the source: skip vertical space.
      advanceLine(1);
      continue;
    }

    let line: Word[] = [];
    let lineWidth = 0;
    const spaceMm = metrics.advanceWidth(' ', sizeMm);

    const flushLine = (): void => {
      if (line.length === 0) return;
      currentPage.lines.push(
        placeLine(line, ctx, metrics, sizeMm, {
          x: contentLeft,
          baselineY,
          spaceMm,
          letterSpacingBase,
          lineIndex,
        }),
      );
      glyphCount += line.reduce((n, w) => n + w.chars.length, 0);
      line = [];
      lineWidth = 0;
      advanceLine(1);
    };

    for (const word of words) {
      const gap = line.length === 0 ? 0 : spaceMm;
      if (line.length > 0 && lineWidth + gap + word.widthMm > contentWidth) {
        flushLine();
      }
      // A single word longer than the line still gets placed (it may overflow
      // slightly into the margin, like real handwriting does).
      lineWidth += (line.length === 0 ? 0 : spaceMm) + word.widthMm;
      line.push(word);
    }
    flushLine();

    // Paragraph spacing (skip after the final paragraph).
    if (p < paragraphs.length - 1 && page.paragraphSpacing > 0) {
      advanceLine(page.paragraphSpacing);
    }
  }

  pages.push(currentPage);

  // Drop a trailing empty page unless it is the only page.
  const nonEmpty = pages.filter((pg, i) => pg.lines.length > 0 || i === 0);
  nonEmpty.forEach((pg, i) => {
    (pg as { pageIndex: number }).pageIndex = i;
  });

  return { pages: nonEmpty, glyphCount };
}

/** Place one wrapped line: compute every glyph's final position + variation. */
function placeLine(
  words: Word[],
  ctx: VariationContext,
  metrics: GlyphMetricsProvider,
  sizeMm: number,
  opts: {
    x: number;
    baselineY: number;
    spaceMm: number;
    letterSpacingBase: number;
    lineIndex: number;
  },
): LayoutLine {
  const glyphs: GlyphInstance[] = [];
  let x = opts.x;
  // Track the previous alternate per character so identical neighbours differ.
  const lastAlternate = new Map<string, number>();

  for (let w = 0; w < words.length; w++) {
    const word = words[w] as Word;
    if (w > 0) {
      x += wordSpacingMm(ctx, opts.spaceMm, w, opts.lineIndex);
    }
    for (let c = 0; c < word.chars.length; c++) {
      const char = word.chars[c] as string;
      const charIndex = word.charIndexes[c] as number;
      const variation = computeGlyphVariation(
        ctx,
        char,
        charIndex,
        lastAlternate.get(char) ?? null,
      );
      lastAlternate.set(char, variation.alternate);

      glyphs.push({
        char,
        x,
        y: opts.baselineY + variation.baselineOffsetMm,
        rotationDeg: variation.rotationDeg,
        scaleX: variation.scaleX,
        scaleY: variation.scaleY,
        pressure: variation.pressure,
        alternate: variation.alternate,
      });

      x +=
        metrics.advanceWidth(char, sizeMm) * variation.scaleX +
        opts.letterSpacingBase +
        variation.letterSpacingDeltaMm;
    }
  }

  return { glyphs, baselineY: opts.baselineY };
}

/** Split source text into paragraphs, remembering each one's character offset. */
function splitParagraphs(text: string): { text: string; offset: number }[] {
  const normalized = text.replace(/\r\n?/g, '\n');
  const result: { text: string; offset: number }[] = [];
  let offset = 0;
  for (const part of normalized.split('\n')) {
    result.push({ text: part, offset });
    offset += part.length + 1;
  }
  return result;
}

/** Split a paragraph into words with base widths (used for wrapping). */
function tokenize(
  text: string,
  paragraphOffset: number,
  sizeMm: number,
  metrics: GlyphMetricsProvider,
): Word[] {
  const words: Word[] = [];
  let current: Word | null = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i] as string;
    if (/\s/.test(char)) {
      current = null;
      continue;
    }
    if (current === null) {
      current = { chars: [], charIndexes: [], widthMm: 0 };
      words.push(current);
    }
    current.chars.push(char);
    current.charIndexes.push(paragraphOffset + i);
    current.widthMm += metrics.advanceWidth(char, sizeMm);
  }
  return words;
}
