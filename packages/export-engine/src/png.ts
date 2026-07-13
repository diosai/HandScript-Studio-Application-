import { mmToPx } from '@handscript/utils';

/**
 * SVG → PNG/JPEG rasterisation (browser/renderer only).
 *
 * Uses an <img> + canvas round-trip, which resolves fonts and SVG filters via
 * the browser engine — identical to what the preview shows. In Node this
 * module is importable but `rasterizeSvg` throws a clear error; PDF export in
 * Node paths should be fed pre-rasterised bytes instead.
 */
export interface RasterizeOptions {
  widthMm: number;
  heightMm: number;
  /** Output resolution. 300 is print quality, 150 is screen/draft. */
  dpi: number;
  format: 'png' | 'jpeg';
  /** JPEG quality 0..1 (ignored for png). */
  quality?: number;
  /** Fill colour behind transparent regions (required for jpeg). */
  background?: string;
}

export async function rasterizeSvg(svg: string, options: RasterizeOptions): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('rasterizeSvg requires a browser environment (renderer process).');
  }

  const width = Math.round(mmToPx(options.widthMm, options.dpi));
  const height = Math.round(mmToPx(options.heightMm, options.dpi));

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire 2D canvas context.');
    if (options.background) {
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);
    return await canvasToBlob(canvas, options);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode SVG for rasterisation.'));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, options: RasterizeOptions): Promise<Blob> {
  const mime = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export produced no data.'))),
      mime,
      options.quality ?? 0.92,
    );
  });
}
