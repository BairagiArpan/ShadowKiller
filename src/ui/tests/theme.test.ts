import { contrast, luminance } from '../color';
import { COLORS, VARIANTS } from '../theme';
import { describe, expect, it} from '@jest/globals';

describe('colour helpers', () => {
  it('knows black, white and their contrast', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 5);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#336699', '#336699')).toBeCloseTo(1, 5);
  });
});

describe('theme readability', () => {
  it.each(Object.entries(VARIANTS))('%s button text is readable on its background', (_name, v) => {
    expect(contrast(v.text, v.bg)).toBeGreaterThanOrEqual(4.5);
  });
  it('body and dim text are readable on panels', () => {
    expect(contrast(COLORS.text, COLORS.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.dim, COLORS.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.gold, COLORS.panel)).toBeGreaterThanOrEqual(4.5);
  });
});