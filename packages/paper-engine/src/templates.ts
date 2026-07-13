import type { PaperConfig, PaperTemplateId } from '@handscript/shared';
import type { Size } from '@handscript/utils';

/**
 * Paper template rendering.
 *
 * Each template is a pure function producing an SVG fragment (no outer <svg>)
 * in millimetre user units. The export engine composes this layer underneath
 * the handwriting layer. Templates draw only with numeric values computed
 * here plus validated colours from PaperConfig, so no untrusted markup can
 * enter the SVG.
 */
export interface PaperTemplateInfo {
  id: PaperTemplateId;
  label: string;
  description: string;
}

export const PAPER_TEMPLATES: PaperTemplateInfo[] = [
  { id: 'blank', label: 'Blank', description: 'Plain paper, no guides.' },
  { id: 'ruled', label: 'Ruled', description: 'Wide-ruled horizontal lines.' },
  { id: 'college-ruled', label: 'College ruled', description: 'Narrow ruling with margin line.' },
  { id: 'grid', label: 'Grid', description: 'Square grid.' },
  { id: 'dot-grid', label: 'Dot grid', description: 'Bullet-journal dot matrix.' },
  { id: 'engineering', label: 'Engineering', description: 'Fine grid with bold major lines.' },
  { id: 'graph', label: 'Graph', description: 'Millimetre-style graph paper.' },
  { id: 'music-staff', label: 'Music staff', description: 'Five-line staves.' },
  { id: 'notebook', label: 'Notebook', description: 'Ruled with margin line and punch holes.' },
  { id: 'legal', label: 'Legal pad', description: 'Yellow pad with double margin line.' },
  { id: 'custom', label: 'Custom', description: 'User-configured ruling.' },
];

/** Render the paper background layer for one page as an SVG fragment. */
export function renderPaperLayer(paper: PaperConfig, page: Size): string {
  const parts: string[] = [
    `<rect x="0" y="0" width="${fmt(page.width)}" height="${fmt(page.height)}" fill="${paper.backgroundColor}"/>`,
  ];

  switch (paper.templateId) {
    case 'blank':
      break;
    case 'ruled':
      parts.push(hLines(page, paper.lineSpacing, paper.lineColor, 0.25, 14));
      break;
    case 'college-ruled':
      parts.push(hLines(page, Math.min(paper.lineSpacing, 7.1), paper.lineColor, 0.22, 14));
      parts.push(vLine(page, 22, paper.marginLineColor, 0.3));
      break;
    case 'grid':
      parts.push(hLines(page, paper.lineSpacing, paper.lineColor, 0.18, 0));
      parts.push(vLines(page, paper.lineSpacing, paper.lineColor, 0.18));
      break;
    case 'dot-grid':
      parts.push(dotGrid(page, paper.lineSpacing, paper.lineColor));
      break;
    case 'engineering': {
      const minor = Math.max(2, paper.lineSpacing / 4);
      parts.push(hLines(page, minor, paper.lineColor, 0.08, 0));
      parts.push(vLines(page, minor, paper.lineColor, 0.08));
      parts.push(hLines(page, paper.lineSpacing, paper.lineColor, 0.25, 0));
      parts.push(vLines(page, paper.lineSpacing, paper.lineColor, 0.25));
      break;
    }
    case 'graph': {
      const minor = Math.max(1, paper.lineSpacing / 5);
      parts.push(hLines(page, minor, paper.lineColor, 0.06, 0));
      parts.push(vLines(page, minor, paper.lineColor, 0.06));
      parts.push(hLines(page, paper.lineSpacing, paper.lineColor, 0.2, 0));
      parts.push(vLines(page, paper.lineSpacing, paper.lineColor, 0.2));
      break;
    }
    case 'music-staff':
      parts.push(musicStaves(page, paper.lineColor));
      break;
    case 'notebook':
      parts.push(hLines(page, paper.lineSpacing, paper.lineColor, 0.22, 14));
      parts.push(vLine(page, 20, paper.marginLineColor, 0.3));
      parts.push(punchHoles(page));
      break;
    case 'legal':
      parts.push(hLines(page, paper.lineSpacing, paper.lineColor, 0.22, 14));
      parts.push(vLine(page, 22, paper.marginLineColor, 0.3));
      parts.push(vLine(page, 24, paper.marginLineColor, 0.3));
      break;
    case 'custom':
      parts.push(hLines(page, paper.lineSpacing, paper.lineColor, 0.2, 14));
      if (paper.marginLine) parts.push(vLine(page, 20, paper.marginLineColor, 0.3));
      if (paper.punchHoles) parts.push(punchHoles(page));
      break;
  }

  return `<g data-layer="paper">${parts.join('')}</g>`;
}

function fmt(n: number): string {
  return Number(n.toFixed(3)).toString();
}

function hLines(
  page: Size,
  spacing: number,
  color: string,
  width: number,
  topOffset: number,
): string {
  const lines: string[] = [];
  for (let y = topOffset + spacing; y <= page.height - 4; y += spacing) {
    lines.push(
      `<line x1="0" y1="${fmt(y)}" x2="${fmt(page.width)}" y2="${fmt(y)}" stroke="${color}" stroke-width="${width}"/>`,
    );
  }
  return lines.join('');
}

function vLines(page: Size, spacing: number, color: string, width: number): string {
  const lines: string[] = [];
  for (let x = spacing; x <= page.width - 1; x += spacing) {
    lines.push(
      `<line x1="${fmt(x)}" y1="0" x2="${fmt(x)}" y2="${fmt(page.height)}" stroke="${color}" stroke-width="${width}"/>`,
    );
  }
  return lines.join('');
}

function vLine(page: Size, x: number, color: string, width: number): string {
  return `<line x1="${fmt(x)}" y1="0" x2="${fmt(x)}" y2="${fmt(page.height)}" stroke="${color}" stroke-width="${width}"/>`;
}

function dotGrid(page: Size, spacing: number, color: string): string {
  const dots: string[] = [];
  for (let y = spacing; y <= page.height - 2; y += spacing) {
    for (let x = spacing; x <= page.width - 2; x += spacing) {
      dots.push(`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="0.3" fill="${color}"/>`);
    }
  }
  return dots.join('');
}

function musicStaves(page: Size, color: string): string {
  const parts: string[] = [];
  const staffLineGap = 2;
  const staffHeight = staffLineGap * 4;
  const staffGap = 14;
  for (let top = 20; top + staffHeight <= page.height - 15; top += staffHeight + staffGap) {
    for (let i = 0; i < 5; i++) {
      const y = top + i * staffLineGap;
      parts.push(
        `<line x1="12" y1="${fmt(y)}" x2="${fmt(page.width - 12)}" y2="${fmt(y)}" stroke="${color}" stroke-width="0.2"/>`,
      );
    }
  }
  return parts.join('');
}

function punchHoles(page: Size): string {
  const holes: string[] = [];
  const count = page.height > 250 ? 4 : 3;
  const inset = 25;
  const gap = (page.height - inset * 2) / (count - 1);
  for (let i = 0; i < count; i++) {
    holes.push(
      `<circle cx="8" cy="${fmt(inset + i * gap)}" r="3" fill="#ffffff" stroke="#00000022" stroke-width="0.2"/>`,
    );
  }
  return holes.join('');
}
