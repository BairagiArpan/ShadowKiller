import { ACHIEVEMENT_REWARDS } from '../../economy/economy.config';
import { CHARACTERS, WEAPONS } from '../../cosmetics/catalog';
import { getWorldLevels } from '../../levels';
import { WORLD_COUNT, levelId } from '../../levels/common';
import { SaveData, defaultSave } from '../../persistence/saveData';
import { emptyStats } from '../../engine/arena';
import { ACHIEVEMENTS, Metric, getAchievement, rewardOf } from '../catalog';
import {
  applyRunStats, claimAchievement, claimableCount, metricValue, sortedAchievements,
} from '../progress';
import { describe, expect, it } from '@jest/globals';

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];

function withLevels(n: number, stars = 1): SaveData {
  const s = defaultSave();
  for (let l = 1; l <= n; l++) {
    s.levels[levelId(1, l)] = { completed: true, stars, bestScore: 0, challengeClears: 0 };
  }
  return s;
}

describe('catalog', () => {
  it('has unique, well-formed ids and positive whole targets', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    ACHIEVEMENTS.forEach((a) => {
      expect(a.id).toMatch(/^[a-z0-9_]{1,48}$/);
      expect(Number.isInteger(a.target)).toBe(true);
      expect(a.target).toBeGreaterThan(0);
      expect(a.name.length).toBeGreaterThan(0);
    });
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
  });

  it('only asks for things that can actually be reached', () => {
    const paid = CHARACTERS.filter((c) => !c.free).length + WEAPONS.filter((w) => !w.free).length;
    const cap: Partial<Record<Metric, number>> = {
      levels_cleared: 500, three_stars: 500, stars: 1500, world_bosses: WORLD_COUNT, skins_owned: paid,
    };
    ACHIEVEMENTS.forEach((a) => {
      const max = cap[a.metric];
      if (max !== undefined) expect(a.target).toBeLessThanOrEqual(max);
    });
  });

  it('pays higher tiers for higher targets within one metric', () => {
    const metrics = new Set(ACHIEVEMENTS.map((a) => a.metric));
    metrics.forEach((m) => {
      const list = ACHIEVEMENTS.filter((a) => a.metric === m).sort((x, y) => x.target - y.target);
      for (let i = 1; i < list.length; i++) {
        expect(TIER_ORDER.indexOf(list[i].tier)).toBeGreaterThanOrEqual(TIER_ORDER.indexOf(list[i - 1].tier));
      }
    });
  });

  it('keeps total achievement coins a modest share of level rewards', () => {
    const totalAch = ACHIEVEMENTS.reduce((s, a) => s + rewardOf(a), 0);
    const levels = Array.from({ length: WORLD_COUNT }, (_, i) => getWorldLevels(i + 1)).flat();
    const firstClear = levels.reduce((s, l) => s + l.baseReward, 0);
    expect(totalAch).toBeLessThan(firstClear * 0.3);
    expect(ACHIEVEMENT_REWARDS.platinum).toBeGreaterThan(ACHIEVEMENT_REWARDS.gold);
    expect(ACHIEVEMENT_REWARDS.gold).toBeGreaterThan(ACHIEVEMENT_REWARDS.silver);
    expect(ACHIEVEMENT_REWARDS.silver).toBeGreaterThan(ACHIEVEMENT_REWARDS.bronze);
  });
});

describe('metrics', () => {
  it('derives level metrics from the saved level records', () => {
    const s = withLevels(3, 2);
    s.levels[levelId(1, 4)] = { completed: true, stars: 3, bestScore: 0, challengeClears: 2 };
    expect(metricValue(s, 'levels_cleared')).toBe(4);
    expect(metricValue(s, 'stars')).toBe(9);
    expect(metricValue(s, 'three_stars')).toBe(1);
    expect(metricValue(s, 'challenges')).toBe(2);
  });
  it('counts world bosses by cleared level 100 only', () => {
    const s = defaultSave();
    s.levels[levelId(2, 100)] = { completed: true, stars: 1, bestScore: 0, challengeClears: 0 };
    s.levels[levelId(3, 99)] = { completed: true, stars: 1, bestScore: 0, challengeClears: 0 };
    expect(metricValue(s, 'world_bosses')).toBe(1);
  });
  it('counts purchased skins but not the free starters', () => {
    const s = defaultSave();
    expect(metricValue(s, 'skins_owned')).toBe(0);
    s.inventory.characters.push('ash_courier');
    s.inventory.weapons.push('ironbark_spear', 'future_unknown_item');
    expect(metricValue(s, 'skins_owned')).toBe(2); // unknown ids do not count
  });
});

describe('claiming', () => {
  it('pays once and refuses a second claim of the same achievement', () => {
    const s = withLevels(1);
    const first = claimAchievement(s, 'first_blood');
    expect(first.result).toEqual({ ok: true, reward: ACHIEVEMENT_REWARDS.bronze });
    expect(first.save.coins).toBe(ACHIEVEMENT_REWARDS.bronze);
    expect(first.save.achievements.claimed).toEqual(['first_blood']);
    const again = claimAchievement(first.save, 'first_blood');
    expect(again.result).toEqual({ ok: false, reason: 'already_claimed' });
    expect(again.save).toBe(first.save);
    expect(s.coins).toBe(0); // input not mutated
  });
  it('refuses unknown ids and targets not yet reached', () => {
    const s = defaultSave();
    expect(claimAchievement(s, 'nope').result).toEqual({ ok: false, reason: 'unknown' });
    const r = claimAchievement(s, 'first_blood');
    expect(r.result).toEqual({ ok: false, reason: 'not_reached' });
    expect(r.save).toBe(s);
  });
  it('rapid repeated claims pay exactly once', () => {
    let s = withLevels(1);
    let paid = 0;
    for (let i = 0; i < 5; i++) {
      const out = claimAchievement(s, 'first_blood');
      if (out.result.ok) paid += out.result.reward;
      s = out.save;
    }
    expect(paid).toBe(rewardOf(getAchievement('first_blood')!));
  });
  it('counts and orders claimable achievements first, claimed last', () => {
    const s = withLevels(25);
    expect(claimableCount(s)).toBe(2); // first_blood + wanderer
    const sorted = sortedAchievements(s);
    expect(['first_blood', 'wanderer']).toContain(sorted[0].id);
    const claimed = claimAchievement(claimAchievement(s, 'first_blood').save, 'wanderer').save;
    expect(claimableCount(claimed)).toBe(0);
    const order = sortedAchievements(claimed);
    expect(order.slice(-2).map((a) => a.id).sort()).toEqual(['first_blood', 'wanderer']);
  });
});

describe('lifetime stats', () => {
  it('accumulate across runs, keep the best combo, and count wins and defeats', () => {
    let s = defaultSave();
    s = applyRunStats(s, { ...emptyStats(), kills: 3, blocks: 2, dodges: 1, specials: 1, maxCombo: 8 }, true);
    s = applyRunStats(s, { ...emptyStats(), kills: 2, maxCombo: 5 }, false);
    expect(s.lifetime).toEqual({ kills: 5, blocks: 2, dodges: 1, specials: 1, maxCombo: 8, runs: 2, wins: 1 });
  });
  it('ignores negative or invalid numbers and does not mutate the input', () => {
    const s = defaultSave();
    const out = applyRunStats(s, { ...emptyStats(), kills: -4, blocks: NaN, maxCombo: Infinity }, false);
    expect(out.lifetime.kills).toBe(0);
    expect(out.lifetime.blocks).toBe(0);
    expect(out.lifetime.maxCombo).toBe(0);
    expect(s.lifetime.runs).toBe(0);
  });
});