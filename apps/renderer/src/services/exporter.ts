import type { LayoutResult, RenderConfig } from '@handscript/shared';
import { resolvePageSize } from '@handscript/shared';
import { buildPdf, rasterizeSvg, renderDocumentSvgs } from '@handscript/export-engine';
import { buildPrintHtml, DEFAULT_PRINT_OPTIONS } from '@handscript/print-engine';
import { saveBinaryFile } from './platform.js';

/**
 * Export orchestration: layout → page SVGs → requested format → save dialog.
 *
 * - SVG: vector, current page.
 * - PNG/JPG: raster, current page, configurable DPI; PNG supports transparency.
 * - PDF: all pages. Inside Electron this uses Chromium's printToPDF for true
 *   vector output; in the browser it rasterises pages at the chosen DPI and
 *   assembles them with pdf-lib.
 */
export interface ExportSettings {
  dpi: number;
  transparent: boolean;
}

export const EXPORT_DPI_CHOICES = [96, 150, 300, 600] as const;

export async function exportSvg(
  layout: LayoutResult,
  config: RenderConfig,
  pageIndex: number,
  title: string,
  settings: ExportSettings,
): Promise<void> {
  const svgs = renderDocumentSvgs(layout.pages, config, {
    transparentBackground: settings.transparent,
  });
  const svg = svgs[pageIndex] ?? svgs[0];
  if (!svg) throw new Error('Nothing to export.');
  await saveBinaryFile(
    `${safeName(title)}-page${pageIndex + 1}.svg`,
    new TextEncoder().encode(svg),
    { name: 'SVG image', extensions: ['svg'] },
  );
}

export async function exportRaster(
  layout: LayoutResult,
  config: RenderConfig,
  pageIndex: number,
  title: string,
  format: 'png' | 'jpeg',
  settings: ExportSettings,
): Promise<void> {
  const size = pageSize(config);
  const svgs = renderDocumentSvgs(layout.pages, config, {
    transparentBackground: settings.transparent && format === 'png',
  });
  const svg = svgs[pageIndex] ?? svgs[0];
  if (!svg) throw new Error('Nothing to export.');
  const blob = await rasterizeSvg(svg, {
    widthMm: size.width,
    heightMm: size.height,
    dpi: settings.dpi,
    format,
    background:
      format === 'jpeg' || !settings.transparent ? config.paper.backgroundColor : undefined,
  });
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  await saveBinaryFile(`${safeName(title)}-page${pageIndex + 1}.${ext}`, blob, {
    name: format.toUpperCase(),
    extensions: [ext],
  });
}

export async function exportPdf(
  layout: LayoutResult,
  config: RenderConfig,
  title: string,
  settings: ExportSettings,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const size = pageSize(config);
  const svgs = renderDocumentSvgs(layout.pages, config);

  let bytes: Uint8Array;
  if (window.handscript) {
    // Vector path: Chromium lays out the same SVGs and prints them to PDF.
    const html = buildPrintHtml(
      { pageSvgs: svgs, pageWidthMm: size.width, pageHeightMm: size.height, title },
      DEFAULT_PRINT_OPTIONS,
    );
    bytes = await window.handscript.htmlToPdf(html, size.width, size.height);
  } else {
    const pages = [];
    for (let i = 0; i < svgs.length; i++) {
      const blob = await rasterizeSvg(svgs[i]!, {
        widthMm: size.width,
        heightMm: size.height,
        dpi: settings.dpi,
        format: 'jpeg',
        quality: 0.92,
        background: config.paper.backgroundColor,
      });
      pages.push({
        bytes: new Uint8Array(await blob.arrayBuffer()),
        format: 'jpeg' as const,
        widthMm: size.width,
        heightMm: size.height,
      });
      onProgress?.(i + 1, svgs.length);
    }
    bytes = await buildPdf(pages, title);
  }

  await saveBinaryFile(`${safeName(title)}.pdf`, bytes, {
    name: 'PDF document',
    extensions: ['pdf'],
  });
}

function pageSize(config: RenderConfig): { width: number; height: number } {
  return resolvePageSize(config.page.sizeId, config.page.orientation, {
    width: config.page.width,
    height: config.page.height,
  });
}

function safeName(title: string): string {
  const cleaned = title
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned || 'handscript';
}
