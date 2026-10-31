import { NO_PERKS, Perks } from '../engine/perks';
import type { HeroState, SaveData } from '../persistence/saveData';
import { SKILLS, getSkill, spentPoints } from './catalog';
import { pointsFor, xpFromCoins } from './xp';

export type RankUpResult =
  | { ok: true; rank: number }
  | { ok: false; reason: 'unknown' | 'max_rank' | 'no_points' };

/** Turns skill ranks into the bonuses the combat engine reads. */
export function perksFor(ranks: Record<string, number>): Perks {
  const p: Perks = { ...NO_PERKS };
  for (const s of SKILLS) {
    const r = Math.min(s.maxRank, Math.max(0, Math.floor(ranks[s.id] ?? 0)));
    p[s.key] = Math.round((p[s.key] + s.perRank * r) * 10000) / 10000;
  }
  return p;
}

export const availablePoints = (hero: HeroState): number =>
  Math.max(0, pointsFor(hero.xp) - spentPoints(hero.ranks));

/** Pure and atomic. On any refusal the SAME save object comes back. */
export function rankUp(save: SaveData, id: string): { save: SaveData; result: RankUpResult } {
  const fail = (reason: 'unknown' | 'max_rank' | 'no_points') => ({ save, result: { ok: false, reason } as RankUpResult });
  const s = getSkill(id);
  if (!s) return fail('unknown');
  const cur = save.hero.ranks[id] ?? 0;
  if (cur >= s.maxRank) return fail('max_rank');
  if (availablePoints(save.hero) < 1) return fail('no_points');
  return {
    save: { ...save, hero: { ...save.hero, ranks: { ...save.hero.ranks, [id]: cur + 1 } } },
    result: { ok: true, rank: cur + 1 },
  };
}

/** Free and instant: every point comes back. */
export function resetSkills(save: SaveData): { save: SaveData; ok: boolean } {
  if (spentPoints(save.hero.ranks) === 0) return { save, ok: false };
  return { save: { ...save, hero: { ...save.hero, ranks: {} } }, ok: true };
}

/** Adds XP for coins earned. Returns the same save when nothing is earned. */
export function awardXp(save: SaveData, coinsEarned: number): SaveData {
  const xp = xpFromCoins(coinsEarned);
  if (xp <= 0) return save;
  return { ...save, hero: { ...save.hero, xp: Math.min(1_000_000_000, save.hero.xp + xp) } };
}