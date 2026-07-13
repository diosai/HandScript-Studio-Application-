import type { LayoutPage, RenderConfig } from '@handscript/shared';
import { resolvePageSize } from '@handscript/shared';
import { getInk, getStyle } from '@handscript/handwriting-engine';
import { renderPaperLayer } from '@handscript/paper-engine';
import { combineSeeds, escapeXml } from '@handscript/utils';

/**
 * SVG page composer.
 *
 * Produces a fully self-contained SVG document per page:
 *   paper layer  →  ink filter definitions  →  handwriting layer  →  decorations.
 *
 * Ink simulation strategy: glyphs are drawn as per-glyph <text> elements
 * (individually transformed by the layout engine's variation data) inside a
 * group that applies an SVG filter chain — fractal-noise displacement roughens
 * stroke edges like paper texture pulling ink, and a subtle blur simulates ink
 * spread. Pen pressure modulates per-glyph opacity and stroke width; alternate
 * indexes add a per-glyph skew so no two occurrences of a letter share a shape.
 *
 * All text content is XML-escaped; colours/numbers come from validated config.
 */
export interface RenderSvgOptions {
  /** Omit the paper layer (transparent background export). */
  transparentBackground?: boolean;
  /** Total page count, needed for "Page x of n" decorations. */
  pageCount?: number;
  /**
   * Apply the ink-simulation filter (default true). Small renders —
   * thumbnails, low preview zooms — disable it: the filter rasterises at
   * on-screen resolution, so at tiny sizes it only costs sharpness and time.
   */
  inkFilter?: boolean;
}

export function renderPageSvg(
  page: LayoutPage,
  config: RenderConfig,
  options: RenderSvgOptions = {},
): string {
  const style = getStyle(config.styleId);
  const ink = getInk(config.inkId);
  const size = resolvePageSize(config.page.sizeId, config.page.orientation, {
    width: config.page.width,
    height: config.page.height,
  });
  const sizeMm = style.baseSizeMm * config.sizeFactor;
  const filterId = `ink-${page.pageIndex}`;
  const noiseSeed = combineSeeds(config.seed, page.pageIndex) % 10000;

  const useFilter = options.inkFilter !== false;
  const defs = useFilter ? inkFilter(filterId, ink, noiseSeed) : '';
  const paper = options.transparentBackground ? '' : renderPaperLayer(config.paper, size);
  const writing = renderWritingLayer(page, config, useFilter ? filterId : null, sizeMm);
  const decorations = renderDecorations(page, config, size, options.pageCount ?? 1, sizeMm);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}mm" height="${size.height}mm" ` +
    `viewBox="0 0 ${fmt(size.width)} ${fmt(size.height)}" font-synthesis="none">` +
    `<defs>${defs}</defs>${paper}${writing}${decorations}</svg>`
  );
}

/** Render every page of a layout result. */
export function renderDocumentSvgs(
  pages: LayoutPage[],
  config: RenderConfig,
  options: RenderSvgOptions = {},
): string[] {
  return pages.map((page) => renderPageSvg(page, config, { ...options, pageCount: pages.length }));
}

function renderWritingLayer(
  page: LayoutPage,
  config: RenderConfig,
  filterId: string | null,
  sizeMm: number,
): string {
  const style = getStyle(config.styleId);
  const ink = getInk(config.inkId);
  const fontFamily = style.fontStack.map((f) => (f.includes(' ') ? `'${f}'` : f)).join(', ');
  const parts: string[] = [];

  for (const line of page.lines) {
    const lineParts: string[] = [];
    for (const glyph of line.glyphs) {
      // Pressure drives opacity and stroke width; dryness deepens the dips.
      const pressureDip = (1 - glyph.pressure) * (0.35 + ink.dryness * 0.5) * ink.pressureVariance;
      const opacity = clamp01(ink.opacity * (1 - pressureDip));
      const strokeW = ink.strokeWidth * (0.6 + glyph.pressure * 0.8);
      // Alternate index adds a stable per-alternate skew so alternates of a
      // letter are visibly distinct shapes, not just jittered copies.
      const skew = (glyph.alternate - (style.alternatesPerChar - 1) / 2) * 1.3;
      const transform =
        `translate(${fmt(glyph.x)} ${fmt(glyph.y)}) ` +
        `rotate(${fmt(glyph.rotationDeg)}) ` +
        `skewX(${fmt(skew)}) ` +
        `scale(${fmt(glyph.scaleX)} ${fmt(glyph.scaleY)})`;
      lineParts.push(
        `<text transform="${transform}" opacity="${fmt(opacity)}"` +
          (strokeW > 0.001 ? ` stroke="${ink.color}" stroke-width="${fmt(strokeW)}"` : '') +
          `>${escapeXml(glyph.char)}</text>`,
      );
    }
    parts.push(`<g data-line="${fmt(line.baselineY)}">${lineParts.join('')}</g>`);
  }

  const filterAttr = filterId ? ` filter="url(#${filterId})"` : '';
  return (
    `<g data-layer="writing"${filterAttr} fill="${ink.color}" ` +
    `font-family="${fontFamily}" font-size="${fmt(sizeMm)}">${parts.join('')}</g>`
  );
}

/** Fractal-noise displacement + spread blur, parameterised by the ink preset. */
function inkFilter(id: string, ink: ReturnType<typeof getInk>, seed: number): string {
  const displacement = 0.1 + ink.texture * 0.35;
  const blur = ink.spread * 0.045;
  return (
    `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="${seed}" result="noise"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="noise" scale="${fmt(displacement)}" ` +
    `xChannelSelector="R" yChannelSelector="G" result="rough"/>` +
    (blur > 0.001
      ? `<feGaussianBlur in="rough" stdDeviation="${fmt(blur)}"/>`
      : `<feMerge><feMergeNode in="rough"/></feMerge>`) +
    `</filter>`
  );
}

function renderDecorations(
  page: LayoutPage,
  config: RenderConfig,
  size: { width: number; height: number },
  pageCount: number,
  sizeMm: number,
): string {
  const style = getStyle(config.styleId);
  const ink = getInk(config.inkId);
  const fontFamily = style.fontStack.map((f) => (f.includes(' ') ? `'${f}'` : f)).join(', ');
  const parts: string[] = [];
  const decoSize = sizeMm * 0.75;

  const anchorX = (align: 'left' | 'center' | 'right'): { x: number; anchor: string } => {
    if (align === 'left') return { x: config.page.margins.left, anchor: 'start' };
    if (align === 'right') return { x: size.width - config.page.margins.right, anchor: 'end' };
    return { x: size.width / 2, anchor: 'middle' };
  };

  if (config.page.header.enabled && config.page.header.text) {
    const { x, anchor } = anchorX(config.page.header.align);
    parts.push(
      `<text x="${fmt(x)}" y="${fmt(config.page.margins.top * 0.6)}" text-anchor="${anchor}"` +
        ` font-size="${fmt(decoSize)}">${escapeXml(config.page.header.text)}</text>`,
    );
  }
  if (config.page.footer.enabled && config.page.footer.text) {
    const { x, anchor } = anchorX(config.page.footer.align);
    parts.push(
      `<text x="${fmt(x)}" y="${fmt(size.height - config.page.margins.bottom * 0.35)}" text-anchor="${anchor}"` +
        ` font-size="${fmt(decoSize)}">${escapeXml(config.page.footer.text)}</text>`,
    );
  }
  if (config.page.pageNumbers) {
    parts.push(
      `<text x="${fmt(size.width / 2)}" y="${fmt(size.height - 6)}" text-anchor="middle"` +
        ` font-size="${fmt(decoSize)}">${page.pageIndex + 1} / ${pageCount}</text>`,
    );
  }

  if (parts.length === 0) return '';
  return (
    `<g data-layer="decorations" fill="${ink.color}" opacity="0.85" ` +
    `font-family="${fontFamily}">${parts.join('')}</g>`
  );
}

function fmt(n: number): string {
  return Number(n.toFixed(3)).toString();
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
