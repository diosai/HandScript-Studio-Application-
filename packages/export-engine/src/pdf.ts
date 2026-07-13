import { MM_PER_INCH } from '@handscript/utils';

/**
 * Multi-page PDF assembly from pre-rasterised page images.
 *
 * Pages are embedded as PNG/JPEG at the caller's chosen DPI (300 for print
 * quality). Runs in both browser and Node — rasterisation itself happens in
 * the renderer (see png.ts) or via Electron's printToPDF for vector output.
 */
export interface PdfPageInput {
  bytes: Uint8Array;
  format: 'png' | 'jpeg';
  widthMm: number;
  heightMm: number;
}

const POINTS_PER_MM = 72 / MM_PER_INCH;

export async function buildPdf(
  pages: PdfPageInput[],
  title = 'HandScript Studio document',
): Promise<Uint8Array> {
  if (pages.length === 0) throw new Error('Cannot build a PDF with zero pages.');

  // Loaded on demand: keeps pdf-lib out of the app's startup bundle.
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setProducer('HandScript Studio');
  doc.setCreator('HandScript Studio');

  for (const page of pages) {
    const image =
      page.format === 'png' ? await doc.embedPng(page.bytes) : await doc.embedJpg(page.bytes);
    const widthPt = page.widthMm * POINTS_PER_MM;
    const heightPt = page.heightMm * POINTS_PER_MM;
    const pdfPage = doc.addPage([widthPt, heightPt]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });
  }

  return doc.save();
}
