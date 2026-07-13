/** Millimetre-based 2D geometry helpers shared by the layout and paper engines. */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const MM_PER_INCH = 25.4;

/** Convert millimetres to pixels at a given DPI (used when rasterising). */
export function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Shrink a rectangle by per-side insets, never inverting it. */
export function insetRect(
  rect: Rect,
  insets: { top: number; right: number; bottom: number; left: number },
): Rect {
  const width = Math.max(0, rect.width - insets.left - insets.right);
  const height = Math.max(0, rect.height - insets.top - insets.bottom);
  return { x: rect.x + insets.left, y: rect.y + insets.top, width, height };
}
