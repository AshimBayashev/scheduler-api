import { COLOR_PALETTE, pickRandomColor } from './color-palette';

describe('color-palette', () => {
  it('pickRandomColor returns a palette color', () => {
    const color = pickRandomColor();
    expect(COLOR_PALETTE).toContain(color);
  });
});
