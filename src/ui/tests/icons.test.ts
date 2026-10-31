import { ICONS, ICON_NAMES } from '../iconData';
import { describe, expect, it } from '@jest/globals';

describe('icon set', () => {
  it('has the icons the screens use', () => {
    ['play', 'pause', 'back', 'home', 'star', 'lock', 'coin', 'settings', 'shop', 'sound',
      'soundOff', 'music', 'check', 'sword', 'plus'].forEach((n) => expect(ICON_NAMES).toContain(n));
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(15);
  });

  it.each(ICON_NAMES)('%s is made of valid shapes inside the 24x24 grid', (name) => {
    const parts = ICONS[name];
    expect(parts.length).toBeGreaterThan(0);
    for (const p of parts) {
      expect(p.d.startsWith('M')).toBe(true);
      expect(p.d).toMatch(/^[MLHVZ0-9.\s]+$/); // only simple straight-line commands
      const nums = p.d.match(/-?\d+(\.\d+)?/g) ?? [];
      expect(nums.length).toBeGreaterThanOrEqual(2);
      nums.forEach((n) => {
        expect(Number(n)).toBeGreaterThanOrEqual(0);
        expect(Number(n)).toBeLessThanOrEqual(24);
      });
    }
  });

  it('draws every icon differently', () => {
    const sigs = ICON_NAMES.map((n) => JSON.stringify(ICONS[n]));
    expect(new Set(sigs).size).toBe(ICON_NAMES.length);
  });
});