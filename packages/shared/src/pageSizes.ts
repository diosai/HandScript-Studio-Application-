import type { PageSizeId } from './types.js';

/** Physical page sizes in millimetres (portrait orientation). */
export const PAGE_SIZES_MM: Record<
  Exclude<PageSizeId, 'custom'>,
  { width: number; height: number }
> = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
};

export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2] as const;

/** Resolve the physical size for a size id + orientation. */
export function resolvePageSize(
  sizeId: PageSizeId,
  orientation: 'portrait' | 'landscape',
  custom?: { width: number; height: number },
): { width: number; height: number } {
  const base = sizeId === 'custom' ? (custom ?? PAGE_SIZES_MM.a4) : PAGE_SIZES_MM[sizeId];
  return orientation === 'portrait'
    ? { width: base.width, height: base.height }
    : { width: base.height, height: base.width };
}
