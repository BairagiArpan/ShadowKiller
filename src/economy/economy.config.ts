import { TIER_BOUNDS } from '../levels/common';
import type { Tier } from '../levels/types';
import type { ItemKind, Rarity } from '../cosmetics/types';

/** Editable reward values. Phase 6 adds shop prices to this file. */
export const REWARDS = {
  tierRange: {
    easy: [10, 14], normal: [14, 20], medium: [20, 30],
    hard: [30, 42], very_hard: [42, 55], extreme: [55, 70],
  } as Record<Exclude<Tier, 'boss'>, [number, number]>,
  worldMultiplierPerWorld: 0.1,          // +10% per world after the first
  miniBossBonus: 25,
  worldBoss: [100, 125, 150, 175, 200],  // by world
  starBonusFraction: 0.25,               // of base reward, per extra star, paid once
  replayFraction: {
    easy: 0.25, normal: 0.3, medium: 0.4, hard: 0.5, very_hard: 0.55, extreme: 0.6, boss: 0.6,
  } as Record<Tier, number>,
  challengeFirstMultiplier: 2.5,         // one-time
  challengeReplayFraction: 0.4,
  minReplayCoins: 1,
};

export function levelBaseReward(world: number, level: number, tier: Tier, miniBoss: boolean): number {
  if (tier === 'boss') return REWARDS.worldBoss[world - 1];
  const [lo, hi] = REWARDS.tierRange[tier];
  const [start, end] = TIER_BOUNDS[tier];
  const t = end > start ? (level - start) / (end - start) : 0;
  const worldMul = 1 + REWARDS.worldMultiplierPerWorld * (world - 1);
  return Math.round((lo + (hi - lo) * t) * worldMul) + (miniBoss ? REWARDS.miniBossBonus : 0);
  
}

/** Editable shop values. Free starter items are marked `free: true` in the catalog files. */
export const SHOP = {
  prices: {
    character: { common: 110, rare: 330, epic: 750, legendary: 1500 },
    weapon:    { common: 110, rare: 330, epic: 750, legendary: 1500 },
  } as Record<ItemKind, Record<Rarity, number>>,
  /** Per-item price override by id, e.g. { lava_warlord: 650 }. Must be a non-negative integer. */
  priceOverrides: {} as Record<string, number>,
  /** Total stars (all worlds) needed before an item can be bought. Weapons are coin-only. */
  starGate: {
    character: { common: 0, rare: 0, epic: 40, legendary: 150 },
    weapon:    { common: 0, rare: 0, epic: 0,  legendary: 0 },
  } as Record<ItemKind, Record<Rarity, number>>,
};