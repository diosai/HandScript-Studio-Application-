import type { GlyphMetricsProvider } from '@handscript/handwriting-engine';
import { approximateMetrics } from '@handscript/handwriting-engine';

/**
 * Canvas-measured glyph metrics for pixel-accurate word wrapping.
 *
 * Widths are measured once per (fontStack, char) at a reference size and
 * cached as em-relative factors, so lookups during layout are O(1). Falls
 * back to the engine's approximate table when canvas is unavailable.
 */
const REFERENCE_PX = 100;

export function createCanvasMetrics(fontStack: string[]): GlyphMetricsProvider {
  if (typeof document === 'undefined') return approximateMetrics;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return approximateMetrics;

  ctx.font = `${REFERENCE_PX}px ${fontStack.map((f) => (f.includes(' ') ? `'${f}'` : f)).join(', ')}`;
  const cache = new Map<string, number>();

  return {
    advanceWidth(char: string, sizeMm: number): number {
      let factor = cache.get(char);
      if (factor === undefined) {
        factor = ctx.measureText(char).width / REFERENCE_PX;
        // Handwriting needs a touch more air than the raw font advance.
        factor *= 1.04;
        cache.set(char, factor);
      }
      return factor * sizeMm;
    },
  };
}
