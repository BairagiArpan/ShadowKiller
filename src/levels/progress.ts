import { DEV_UNLOCK_ALL } from '../config/dev';
import { REWARDS } from '../economy/economy.config';
import { SaveData, LevelRecord, starsInWorld } from '../persistence/saveData';
import { LEVELS_PER_WORLD, WORLD_COUNT, levelId } from './common';
import type { LevelConfig } from './types';

/** Cumulative stars required across all earlier worlds to open world N (index 0 = world 1). */
export const WORLD_STAR_REQUIREMENTS = [0, 150, 330, 540, 780];

export interface LevelResult { won: boolean; stars: number; score: number }
export interface RewardBreakdown {
  firstClear: number; starBonus: number; replay: number; challenge: number; total: number;
}
export const NO_REWARD: RewardBreakdown = { firstClear: 0, starBonus: 0, replay: 0, challenge: 0, total: 0 };

export function starsBeforeWorld(save: SaveData, world: number): number {
  let n = 0;
  for (let w = 1; w < world; w++) n += starsInWorld(save, w);
  return n;
}

export function isWorldUnlocked(save: SaveData, world: number): boolean {
  if (DEV_UNLOCK_ALL) return true;
  if (world < 1 || world > WORLD_COUNT) return false;
  if (world === 1) return true;
  const cleared = !!save.levels[levelId(world - 1, LEVELS_PER_WORLD)]?.completed;
  return cleared && starsBeforeWorld(save, world) >= WORLD_STAR_REQUIREMENTS[world - 1];
}

export function worldLockReason(save: SaveData, world: number): string | null {
  if (isWorldUnlocked(save, world)) return null;
  const prev = world - 1;
  if (!save.levels[levelId(prev, LEVELS_PER_WORLD)]?.completed) return `Clear level ${LEVELS_PER_WORLD} of world ${prev}`;
  return `Earn ${WORLD_STAR_REQUIREMENTS[world - 1]}★ in worlds 1–${prev} (you have ${starsBeforeWorld(save, world)}★)`;
}

export function isLevelUnlocked(save: SaveData, world: number, level: number): boolean {
  if (level < 1 || level > LEVELS_PER_WORLD) return false;
  if (!isWorldUnlocked(save, world)) return false;
  if (DEV_UNLOCK_ALL || level === 1) return true;
  return !!save.levels[levelId(world, level - 1)]?.completed;
}

/** First unfinished unlocked level (where the PLAY button goes). */
export function nextPlayable(save: SaveData): { world: number; level: number } {
  let last = { world: 1, level: 1 };
  for (let w = 1; w <= WORLD_COUNT; w++) {
    if (!isWorldUnlocked(save, w)) break;
    for (let l = 1; l <= LEVELS_PER_WORLD; l++) {
      last = { world: w, level: l };
      if (!save.levels[levelId(w, l)]?.completed) return last;
    }
  }
  return last;
}

export function computeReward(
  cfg: LevelConfig, prev: LevelRecord | undefined, result: LevelResult, challenge: boolean,
): RewardBreakdown {
  if (!result.won) return { ...NO_REWARD };
  const base = cfg.baseReward;

  if (challenge) {
    const first = (prev?.challengeClears ?? 0) === 0;
    const coins = first
      ? Math.round(base * REWARDS.challengeFirstMultiplier)
      : Math.max(REWARDS.minReplayCoins, Math.round(base * REWARDS.challengeReplayFraction));
    return { ...NO_REWARD, challenge: coins, total: coins };
  }

  const wasCompleted = !!prev?.completed;
  const prevStars = prev?.stars ?? 0;
  const bonusStars = Math.max(0, result.stars - Math.max(prevStars, 1)); // star 1 is the clear itself
  const starBonus = bonusStars * Math.round(base * REWARDS.starBonusFraction);
  const firstClear = wasCompleted ? 0 : base;
  const replay = wasCompleted
    ? Math.max(REWARDS.minReplayCoins, Math.round(base * REWARDS.replayFraction[cfg.tier]))
    : 0;
  return { firstClear, starBonus, replay, challenge: 0, total: firstClear + starBonus + replay };
}

/** Pure: returns a new save and the reward. Refuses locked levels and not-yet-cleared challenges. */
export function applyResult(
  save: SaveData, cfg: LevelConfig, result: LevelResult, challenge: boolean,
): { save: SaveData; reward: RewardBreakdown } {
  const unchanged = { save, reward: { ...NO_REWARD } };
  if (!result.won) return unchanged;
  if (!isLevelUnlocked(save, cfg.world, cfg.level)) return unchanged;
  const prev = save.levels[cfg.id];
  if (challenge && !prev?.completed) return unchanged;

  const reward = computeReward(cfg, prev, result, challenge);
  const rec: LevelRecord = challenge
    ? { ...(prev as LevelRecord), challengeClears: (prev?.challengeClears ?? 0) + 1 }
    : {
        completed: true,
        stars: Math.min(3, Math.max(prev?.stars ?? 0, result.stars, 1)),
        bestScore: Math.max(prev?.bestScore ?? 0, Math.max(0, Math.floor(result.score))),
        challengeClears: prev?.challengeClears ?? 0,
      };
  return {
    save: {
      ...save,
      coins: Math.max(0, save.coins + reward.total),
      levels: { ...save.levels, [cfg.id]: rec },
    },
    reward,
  };
}