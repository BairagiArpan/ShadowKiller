import { defaultSave, sanitizeSave } from '../saveData';
import { it, describe, expect } from '@jest/globals';

describe('save version 4', () => {
  it('has empty defaults for the new sections', () => {
    const s = defaultSave();
    expect(s.version).toBe(4);
    expect(s.daily).toEqual({ lastClaimAt: 0, streak: 0, totalClaims: 0, maxSeen: 0 });
    expect(s.lifetime).toEqual({ kills: 0, blocks: 0, dodges: 0, specials: 0, maxCombo: 0, runs: 0, wins: 0 });
    expect(s.achievements.claimed).toEqual([]);
  });

  it('upgrades a version 3 save without losing anything', () => {
    const old = { version: 3, coins: 123, levels: {}, settings: { graphics: 'low' } };
    const s = sanitizeSave(old);
    expect(s.version).toBe(4);
    expect(s.coins).toBe(123);
    expect(s.settings.graphics).toBe('low');
    expect(s.daily).toEqual(defaultSave().daily);
  });

  it('clamps and repairs bad values', () => {
    const s = sanitizeSave({
      daily: { lastClaimAt: -5, streak: 1e12, totalClaims: 'x', maxSeen: 10 },
      lifetime: { kills: -1, maxCombo: 5.9, runs: 'many' },
      achievements: { claimed: ['first_blood', 'first_blood', 'BAD ID!', 3, null] },
    });
    expect(s.daily).toEqual({ lastClaimAt: 0, streak: 100000, totalClaims: 0, maxSeen: 10 });
    expect(s.lifetime.kills).toBe(0);
    expect(s.lifetime.maxCombo).toBe(5);
    expect(s.lifetime.runs).toBe(0);
    expect(s.achievements.claimed).toEqual(['first_blood']);
  });

  it('never lets "latest time seen" be older than the last claim', () => {
    expect(sanitizeSave({ daily: { lastClaimAt: 500, maxSeen: 100 } }).daily.maxSeen).toBe(500);
  });

  it('survives garbage and a JSON round trip', () => {
    expect(sanitizeSave({ daily: 'x', lifetime: 5, achievements: [] })).toEqual(defaultSave());
    const s = {
      ...defaultSave(), coins: 40,
      daily: { lastClaimAt: 1_700_000_000_000, streak: 3, totalClaims: 9, maxSeen: 1_700_000_100_000 },
      lifetime: { kills: 12, blocks: 3, dodges: 4, specials: 1, maxCombo: 9, runs: 5, wins: 3 },
      achievements: { claimed: ['first_blood', 'slayer'] },
    };
    expect(sanitizeSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});