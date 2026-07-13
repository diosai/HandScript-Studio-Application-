import type { HandwritingStyle } from '@handscript/shared';

/**
 * Font embedding for exports.
 *
 * The preview renders SVG inline in the document, so the app's @font-face
 * webfonts apply. Exported SVGs are rasterised via an <img>, and printed
 * pages load in an isolated window — in both cases the SVG/HTML is a sealed
 * document with NO access to the app's fonts, so text falls back to a
 * generic font. The cure: inline the style's font file as a data: URI
 * @font-face rule carried inside the exported SVG/print HTML itself.
 *
 * Font bytes are fetched once per family and cached as ready-made CSS.
 */
const FONT_FILES: Record<string, string> = {
  'Patrick Hand': 'PatrickHand-Regular.ttf',
  'Comic Neue': 'ComicNeue-Regular.ttf',
  'Dancing Script': 'DancingScript-Regular.ttf',
  Schoolbell: 'Schoolbell-Regular.ttf',
  'Great Vibes': 'GreatVibes-Regular.ttf',
  Tangerine: 'Tangerine-Regular.ttf',
  'Architects Daughter': 'ArchitectsDaughter-Regular.ttf',
};

const cssCache = new Map<string, Promise<string>>();

/**
 * Build @font-face CSS (data: URIs) for every bundled font in a style's
 * stack. Missing/unfetchable fonts degrade to an empty rule — the export
 * then uses the same fallback the preview would.
 */
export async function buildEmbeddedFontCss(style: HandwritingStyle): Promise<string> {
  const rules = await Promise.all(
    style.fontStack
      .filter((family) => family in FONT_FILES)
      .map((family) => embeddedFontRule(family)),
  );
  return rules.filter(Boolean).join('\n');
}

function embeddedFontRule(family: string): Promise<string> {
  let cached = cssCache.get(family);
  if (!cached) {
    cached = fetchFontRule(family).catch((error) => {
      console.warn(`Could not embed font "${family}" for export:`, error);
      cssCache.delete(family); // allow a retry on the next export
      return '';
    });
    cssCache.set(family, cached);
  }
  return cached;
}

async function fetchFontRule(family: string): Promise<string> {
  const file = FONT_FILES[family];
  if (!file) return '';
  // Relative path so it works from the dev server, static hosting and
  // Electron's file:// origin alike.
  const response = await fetch(`fonts/${file}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const base64 = arrayBufferToBase64(await response.arrayBuffer());
  return (
    `@font-face{font-family:'${family}';` +
    `src:url(data:font/ttf;base64,${base64}) format('truetype');}`
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
