export const XP_PER_COIN = 2;
export const MAX_HERO_LEVEL = 20;

/** Total XP needed to reach a level: 100 for level 2, 300 for level 3, 19,000 for level 20. */
export const xpForLevel = (level: number): number => 50 * (level - 1) * level;

export function levelFor(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_HERO_LEVEL && xp >= xpForLevel(lvl + 1)) lvl += 1;
  return lvl;
}

/** One skill point per level above 1. */
export const pointsFor = (xp: number): number => levelFor(xp) - 1;

export function xpFromCoins(coins: number): number {
  return Number.isFinite(coins) && coins > 0 ? Math.floor(coins) * XP_PER_COIN : 0;
}

export function levelProgress(xp: number): { level: number; into: number; need: number; fraction: number } {
  const level = levelFor(xp);
  if (level >= MAX_HERO_LEVEL) return { level, into: 0, need: 0, fraction: 1 };
  const base = xpForLevel(level);
  const need = xpForLevel(level + 1) - base;
  const into = Math.max(0, xp - base);
  return { level, into, need, fraction: Math.min(1, into / need) };
}