import { GROUND_Y } from '../../engine/constants';
import { BACKDROPS, layerPath, mixHex, pickLayers } from '../backdrop';
import { it, expect, describe } from '@jest/globals';

describe('backdrops', () => {
  it('defines three ordered layers for each world, resting on or behind the ground', () => {
    for (let w = 1; w <= 5; w++) {
      const defs = BACKDROPS[w];
      expect(defs).toHaveLength(3);
      for (let i = 1; i < defs.length; i++) expect(defs[i].factor).toBeGreaterThan(defs[i - 1].factor);
      defs.forEach((d) => expect(d.baseY).toBeLessThanOrEqual(GROUND_Y + 5));
    }
  });
  it('builds a deterministic, non-empty path for every layer', () => {
    for (let w = 1; w <= 5; w++) {
      BACKDROPS[w].forEach((d, i) => {
        const p = layerPath(d, w * 31 + i);
        expect(p.startsWith('M')).toBe(true);
        expect(p.length).toBeGreaterThan(50);
        expect(layerPath(d, w * 31 + i)).toBe(p);
        expect(p).not.toContain('NaN');
      });
    }
  });
  it('picks 1, 2 or 3 layers by count', () => {
    const d = BACKDROPS[1];
    expect(pickLayers(d, 1)).toHaveLength(1);
    expect(pickLayers(d, 2)).toEqual([d[0], d[2]]);
    expect(pickLayers(d, 3)).toHaveLength(3);
  });
  it('mixes colors', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ff0000', 0.5)).toBe('#800000');
  });
});