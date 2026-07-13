import type { PageSetup, PaperConfig, RandomnessProfile, RenderConfig } from './types.js';
import { PAGE_SIZES_MM } from './pageSizes.js';

export const DEFAULT_RANDOMNESS: RandomnessProfile = {
  characterPosition: 0.5,
  characterAngle: 0.5,
  characterSize: 0.5,
  baseline: 0.5,
  wordSpacing: 0.5,
  letterSpacing: 0.5,
  lineSpacing: 0.35,
  intensity: 0.6,
};

export const DEFAULT_PAPER: PaperConfig = {
  templateId: 'ruled',
  backgroundColor: '#fdfcf7',
  lineColor: '#b8c6db',
  lineSpacing: 8,
  marginLine: false,
  marginLineColor: '#e8a0a0',
  punchHoles: false,
};

export const DEFAULT_PAGE: PageSetup = {
  sizeId: 'a4',
  width: PAGE_SIZES_MM.a4.width,
  height: PAGE_SIZES_MM.a4.height,
  orientation: 'portrait',
  margins: { top: 20, right: 18, bottom: 20, left: 18 },
  paragraphSpacing: 0.5,
  lineHeight: 1.6,
  header: { enabled: false, text: '', align: 'center' },
  footer: { enabled: false, text: '', align: 'center' },
  pageNumbers: false,
};

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  styleId: 'print',
  inkId: 'blue-ballpoint',
  paper: DEFAULT_PAPER,
  page: DEFAULT_PAGE,
  randomness: DEFAULT_RANDOMNESS,
  seed: 1337,
  sizeFactor: 1,
};
