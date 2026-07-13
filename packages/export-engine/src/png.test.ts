import { describe, expect, it } from 'vitest';
import { setSvgPixelSize } from './png.js';

describe('setSvgPixelSize', () => {
  it('replaces mm dimensions with exact pixel dimensions on the root tag only', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" ' +
      'viewBox="0 0 210 297"><rect width="210mm" height="297mm"/></svg>';
    const sized = setSvgPixelSize(svg, 2480, 3508);
    expect(sized).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297"');
    expect(sized).toContain('width="2480" height="3508">');
    // Inner elements keep their own sizes untouched.
    expect(sized).toContain('<rect width="210mm" height="297mm"/>');
  });

  it('keeps the viewBox so the drawing scales to the new size', () => {
    const sized = setSvgPixelSize(
      '<svg width="10mm" height="20mm" viewBox="0 0 10 20"></svg>',
      100,
      200,
    );
    expect(sized).toBe('<svg viewBox="0 0 10 20" width="100" height="200"></svg>');
  });

  it('adds dimensions when the root tag has none', () => {
    const sized = setSvgPixelSize('<svg viewBox="0 0 1 1"></svg>', 50, 50);
    expect(sized).toBe('<svg viewBox="0 0 1 1" width="50" height="50"></svg>');
  });
});
