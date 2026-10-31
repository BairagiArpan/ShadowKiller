import { NO_PERKS } from '../../engine/perks';
import { getWorldLevels } from '../../levels';
import { defaultSave, sanitizeHero, sanitizeSave } from '../../persistence/saveData';
import { BRANCHES, SKILLS, spentPoints } from '../catalog';
import { availablePoints, awardXp, perksFor, rankUp, resetSkills } from '../progress';
import { MAX_HERO_LEVEL, XP_PER_COIN, levelFor, levelProgress, pointsFor, xpForLevel, xpFromCoins } from '../xp';
import { describe, expect, it } from '@jest/globals';

const withXp = (xp: number) => ({ ...defaultSave(), hero: { xp, ranks: {} } });
const maxed = Object.fromEntries(SKILLS.map((s) => [s.id, s.maxRank]));

describe('catalog', () => {
  it('has unique ids, valid ranks, and every branch is used', () => {
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length);
    SKILLS.forEach((s) => {
      expect(s.id).toMatch(/^[a-z0-9_]{1,48}$/);
      expect(s.maxRank).toBeGreaterThanOrEqual(1);
      expect(s.maxRank).toBeLessThanOrEqual(5);
      expect(s.perRank).toBeGreaterThan(0);
      expect(s.text(1).length).toBeGreaterThan(0);
    });
    BRANCHES.forEach((b) => expect(SKILLS.some((s) => s.branch === b.id)).toBe(true));
  });

  it('offers more ranks than points, so choices matter', () => {
    expect(spentPoints(maxed)).toBeGreaterThan(pointsFor(xpForLevel(MAX_HERO_LEVEL)));
  });

  it('keeps every bonus small, even when everything is maxed', () => {
    const p = perksFor(maxed);
    expect(p.damage).toBeLessThanOrEqual(1.2);
    expect(p.maxHp).toBeLessThanOrEqual(25);
    expect(p.energyGain).toBeLessThanOrEqual(1.5);
    expect(p.blockReduction).toBeLessThanOrEqual(0.9);
    expect(p.dodgeInvuln).toBeLessThanOrEqual(0.1);
    expect(p.specialCostDown).toBeLessThanOrEqual(15);
    expect(p.specialDamage).toBeLessThanOrEqual(1.5);
  });

  it('no skills means no change at all', () => {
    expect(perksFor({})).toEqual(NO_PERKS);
  });

  it('ignores unknown skills and caps over-high ranks', () => {
    expect(perksFor({ keen_edge: 99, ghost_skill: 5 }).damage).toBe(perksFor({ keen_edge: 5 }).damage);
  });
});

describe('xp and levels', () => {
  it('follows the curve and is capped', () => {
    expect([xpForLevel(2), xpForLevel(3), xpForLevel(10), xpForLevel(20)]).toEqual([100, 300, 4500, 19000]);
    expect(levelFor(0)).toBe(1);
    expect(levelFor(99)).toBe(1);
    expect(levelFor(100)).toBe(2);
    expect(levelFor(299)).toBe(2);
    expect(levelFor(300)).toBe(3);
    expect(levelFor(1e9)).toBe(MAX_HERO_LEVEL);
    expect(pointsFor(1e9)).toBe(MAX_HERO_LEVEL - 1);
  });
  it('reports progress inside a level', () => {
    expect(levelProgress(150)).toEqual({ level: 2, into: 50, need: 200, fraction: 0.25 });
    expect(levelProgress(1e9)).toMatchObject({ level: MAX_HERO_LEVEL, need: 0, fraction: 1 });
  });
  it('turns coins into XP safely', () => {
    expect(xpFromCoins(10)).toBe(10 * XP_PER_COIN);
    expect(xpFromCoins(10.9)).toBe(10 * XP_PER_COIN);
    [0, -5, NaN, Infinity].forEach((c) => expect(xpFromCoins(c)).toBe(0));
  });
  it('first 20 levels of World 1 earn at least 2 skill points', () => {
    const coins = getWorldLevels(1).slice(0, 20).reduce((s, l) => s + l.baseReward, 0);
    expect(pointsFor(xpFromCoins(coins))).toBeGreaterThanOrEqual(2);
  });
  it('saveData uses the same level rule as xp.ts', () => {
    for (const xp of [0, 99, 100, 299, 300, 4499, 4500, 18999, 19000, 1e8]) {
      const ranks = { keen_edge: Math.min(5, pointsFor(xp)) };
      expect(sanitizeHero({ xp, ranks }).ranks).toEqual(pointsFor(xp) >= 1 ? ranks : {});
      expect(sanitizeHero({ xp, ranks: { keen_edge: 5, vitality: 5, power: 3, focus: 3, guard: 3, evasion: 3, surge: 3 } }).ranks)
        .toEqual(pointsFor(xp) >= 25 ? maxed : {});
    }
  });
});

describe('awarding XP', () => {
  it('adds XP for coins and leaves the input alone', () => {
    const s = defaultSave();
    const out = awardXp(s, 25);
    expect(out.hero.xp).toBe(50);
    expect(s.hero.xp).toBe(0);
  });
  it('gives nothing for zero or invalid coins and returns the same save', () => {
    const s = defaultSave();
    expect(awardXp(s, 0)).toBe(s);
    expect(awardXp(s, NaN)).toBe(s);
  });
});

describe('spending points', () => {
  it('needs a free point and never goes past the max rank', () => {
    const none = withXp(50);
    const refused = rankUp(none, 'keen_edge');
    expect(refused.result).toEqual({ ok: false, reason: 'no_points' });
    expect(refused.save).toBe(none);

    let s = withXp(xpForLevel(8)); // 7 points
    for (let i = 1; i <= 5; i++) {
      const r = rankUp(s, 'keen_edge');
      expect(r.result).toEqual({ ok: true, rank: i });
      s = r.save;
    }
    expect(rankUp(s, 'keen_edge').result).toEqual({ ok: false, reason: 'max_rank' });
    expect(availablePoints(s.hero)).toBe(2);
  });
  it('refuses unknown skills', () => {
    const s = withXp(1000);
    expect(rankUp(s, 'nope').result).toEqual({ ok: false, reason: 'unknown' });
  });
  it('rapid taps can never spend more than earned', () => {
    let s = withXp(300); // 2 points
    for (let i = 0; i < 20; i++) s = rankUp(s, i % 2 ? 'vitality' : 'focus').save;
    expect(spentPoints(s.hero.ranks)).toBe(2);
    expect(availablePoints(s.hero)).toBe(0);
  });
  it('reset returns every point for free and keeps XP', () => {
    let s = withXp(300);
    s = rankUp(rankUp(s, 'power').save, 'power').save;
    const r = resetSkills(s);
    expect(r.ok).toBe(true);
    expect(availablePoints(r.save.hero)).toBe(2);
    expect(r.save.hero.xp).toBe(300);
    expect(resetSkills(r.save).ok).toBe(false);
  });
});

describe('saved hero data', () => {
  it('starts empty and old saves without it are fine', () => {
    expect(defaultSave().hero).toEqual({ xp: 0, ranks: {} });
    expect(sanitizeSave({ version: 4, coins: 5 }).hero).toEqual({ xp: 0, ranks: {} });
  });
  it('clamps, drops unknown skills and caps ranks', () => {
    const h = sanitizeHero({ xp: -5, ranks: {} });
    expect(h.xp).toBe(0);
    const g = sanitizeHero({ xp: 5000, ranks: { keen_edge: 99, ghost: 4, vitality: 'x' } });
    expect(g.ranks).toEqual({ keen_edge: 5 });
  });
  it('clears ranks that cost more points than the XP allows', () => {
    expect(sanitizeHero({ xp: 100, ranks: { keen_edge: 5 } }).ranks).toEqual({});
    expect(sanitizeHero({ xp: 100, ranks: { keen_edge: 1 } }).ranks).toEqual({ keen_edge: 1 });
  });
  it('survives garbage and a JSON round trip', () => {
    expect(sanitizeHero('x')).toEqual({ xp: 0, ranks: {} });
    const s = { ...defaultSave(), hero: { xp: 4500, ranks: { keen_edge: 3, power: 2 } } };
    expect(sanitizeSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});