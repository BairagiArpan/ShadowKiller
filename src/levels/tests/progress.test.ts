import { REWARDS } from '../../economy/economy.config';
import { SaveData, defaultSave, sanitizeSave } from '../../persistence/saveData';
import { LEVELS_PER_WORLD, levelId } from '../common';
import { getLevel } from '../index';
import {applyResult, isLevelUnlocked, isWorldUnlocked, nextPlayable } from '../progress';
import { evaluateRun } from '../scoring';
import { createArena } from '../../engine/arena';
import { describe, expect, it } from '@jest/globals';

const win = (stars: number, score = 1000) => ({ won: true, stars, score });

function clear(save: SaveData, world: number, from: number, to: number, stars: number): void {
  for (let l = from; l <= to; l++) {
    save.levels[levelId(world, l)] = { completed: true, stars, bestScore: 0, challengeClears: 0 };
  }
}

describe('unlocks', () => {
  it('only level 1 of world 1 is open at the start', () => {
    const s = defaultSave();
    expect(isLevelUnlocked(s, 1, 1)).toBe(true);
    expect(isLevelUnlocked(s, 1, 2)).toBe(false);
    expect(isWorldUnlocked(s, 2)).toBe(false);
    expect(nextPlayable(s)).toEqual({ world: 1, level: 1 });
  });

  it('completing a level opens the next one only', () => {
    const s = defaultSave();
    clear(s, 1, 1, 1, 1);
    expect(isLevelUnlocked(s, 1, 2)).toBe(true);
    expect(isLevelUnlocked(s, 1, 3)).toBe(false);
    expect(nextPlayable(s)).toEqual({ world: 1, level: 2 });
  });

  it('world 2 needs level 100 AND enough stars', () => {
    const lowStars = defaultSave();
    clear(lowStars, 1, 1, 100, 1); // 100 stars < 150
    expect(isWorldUnlocked(lowStars, 2)).toBe(false);

    const noBoss = defaultSave();
    clear(noBoss, 1, 1, 99, 3); // 297 stars but level 100 missing
    expect(isWorldUnlocked(noBoss, 2)).toBe(false);

    const ok = defaultSave();
    clear(ok, 1, 1, 100, 2); // 200 stars
    expect(isWorldUnlocked(ok, 2)).toBe(true);
    expect(isLevelUnlocked(ok, 2, 1)).toBe(true);
    expect(isLevelUnlocked(ok, 2, 2)).toBe(false);
    expect(nextPlayable(ok)).toEqual({ world: 2, level: 1 });
  });
});

describe('rewards', () => {
  const cfg = getLevel(1, 1);
  const base = cfg.baseReward;

  it('pays the base reward for a first one-star clear', () => {
    const { save, reward } = applyResult(defaultSave(), cfg, win(1), false);
    expect(reward.total).toBe(base);
    expect(save.coins).toBe(base);
    expect(save.levels[cfg.id].completed).toBe(true);
  });

  it('adds a star bonus for extra stars on the first clear', () => {
    const { reward } = applyResult(defaultSave(), cfg, win(3), false);
    expect(reward.total).toBe(base + 2 * Math.round(base * REWARDS.starBonusFraction));
  });

  it('does not pay the same objective twice', () => {
    const first = applyResult(defaultSave(), cfg, win(3), false);
    const again = applyResult(first.save, cfg, win(3), false);
    expect(again.reward.firstClear).toBe(0);
    expect(again.reward.starBonus).toBe(0);
    expect(again.reward.total).toBe(Math.max(REWARDS.minReplayCoins, Math.round(base * REWARDS.replayFraction.easy)));
  });

  it('pays only newly earned stars on a replay and never lowers stars', () => {
    const one = applyResult(defaultSave(), cfg, win(1), false);
    const up = applyResult(one.save, cfg, win(3), false);
    expect(up.reward.starBonus).toBe(2 * Math.round(base * REWARDS.starBonusFraction));
    expect(up.save.levels[cfg.id].stars).toBe(3);
    const down = applyResult(up.save, cfg, win(1), false);
    expect(down.save.levels[cfg.id].stars).toBe(3);
  });

  it('keeps the best score', () => {
    const a = applyResult(defaultSave(), cfg, win(1, 500), false);
    const b = applyResult(a.save, cfg, win(1, 300), false);
    expect(b.save.levels[cfg.id].bestScore).toBe(500);
  });

  it('pays less for replaying easy levels than boss levels', () => {
    expect(REWARDS.replayFraction.easy).toBeLessThan(REWARDS.replayFraction.boss);
  });

  it('pays higher-difficulty levels more', () => {
    expect(getLevel(1, 99).baseReward).toBeGreaterThan(getLevel(1, 1).baseReward);
    expect(getLevel(5, 100).baseReward).toBeGreaterThan(getLevel(1, 100).baseReward);
  });

  it('gives nothing for a defeat or a locked level, and does not mutate the input', () => {
    const s = defaultSave();
    expect(applyResult(s, cfg, { won: false, stars: 0, score: 0 }, false).reward.total).toBe(0);
    const locked = applyResult(s, getLevel(1, 5), win(3), false);
    expect(locked.reward.total).toBe(0);
    expect(locked.save).toBe(s);
    applyResult(s, cfg, win(1), false);
    expect(s.coins).toBe(0);
  });

  it('challenge mode needs a cleared level, pays a big one-time bonus, then a small amount', () => {
    const s0 = defaultSave();
    expect(applyResult(s0, cfg, win(1), true).reward.total).toBe(0);

    const s1 = applyResult(s0, cfg, win(1), false).save;
    const c1 = applyResult(s1, cfg, win(1), true);
    expect(c1.reward.challenge).toBe(Math.round(base * REWARDS.challengeFirstMultiplier));
    expect(c1.save.levels[cfg.id].challengeClears).toBe(1);
    expect(c1.save.levels[cfg.id].stars).toBe(1); // challenge never changes stars

    const c2 = applyResult(c1.save, cfg, win(1), true);
    expect(c2.reward.challenge).toBe(Math.max(REWARDS.minReplayCoins, Math.round(base * REWARDS.challengeReplayFraction)));
  });
});

describe('scoring and stars', () => {
  const cfg = { ...getLevel(1, 3), objective: { kind: 'combo' as const, target: 5, label: 'x' } };
  const finished = (combo: number, hp: number) => {
    const a = createArena({ waves: [['melee']] });
    a.over = 'victory'; a.stats.maxCombo = combo; a.stats.kills = 1; a.player.hp = hp; a.time = 10;
    return evaluateRun(cfg, a);
  };
  it('awards 3 stars for objective + healthy finish', () => expect(finished(6, 60).stars).toBe(3));
  it('awards 2 stars for objective but low health', () => expect(finished(6, 40).stars).toBe(2));
  it('awards 1 star for a win without the objective', () => expect(finished(2, 90).stars).toBe(1));
  it('awards 0 stars for a defeat', () => {
    const a = createArena({ waves: [['melee']] });
    a.over = 'defeat';
    expect(evaluateRun(cfg, a).stars).toBe(0);
  });
});

describe('save sanitising', () => {
  it('falls back to a default for garbage', () => {
    expect(sanitizeSave(null)).toEqual(defaultSave());
    expect(sanitizeSave('x')).toEqual(defaultSave());
  });
  it('clamps values and drops unknown keys', () => {
    const s = sanitizeSave({
      coins: -50,
      levels: {
        [levelId(1, 1)]: { completed: true, stars: 9, bestScore: -3, challengeClears: 2.7 },
        'hack-level': { completed: true, stars: 3 },
        [levelId(2, 7)]: { completed: false, stars: 2 },
      },
    });
    expect(s.coins).toBe(0);
    expect(s.levels[levelId(1, 1)]).toEqual({ completed: true, stars: 3, bestScore: 0, challengeClears: 2 });
    expect(s.levels['hack-level']).toBeUndefined();
    expect(s.levels[levelId(2, 7)].completed).toBe(true); // stars > 0 implies completed
  });
  it('level 100 is a valid address', () => {
    expect(sanitizeSave({ levels: { [levelId(5, LEVELS_PER_WORLD)]: { stars: 1 } } }).levels[levelId(5, 100)]).toBeDefined();
  });
});