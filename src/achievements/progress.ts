import { getCharacter, getWeapon } from '../cosmetics/catalog';
import type { Stats } from '../engine/types';
import { LEVELS_PER_WORLD, WORLD_COUNT, levelId } from '../levels/common';
import type { SaveData } from '../persistence/saveData';
import { ACHIEVEMENTS, AchievementDef, Metric, getAchievement, rewardOf } from './catalog';

export type AchievementClaim =
  | { ok: true; reward: number }
  | { ok: false; reason: 'unknown' | 'already_claimed' | 'not_reached' };

/** Current value of a metric. Everything is derived from saved data, so it can never drift out of sync. */
export function metricValue(save: SaveData, m: Metric): number {
  const recs = Object.values(save.levels);
  switch (m) {
    case 'levels_cleared': return recs.filter((r) => r.completed).length;
    case 'stars': return recs.reduce((s, r) => s + r.stars, 0);
    case 'three_stars': return recs.filter((r) => r.stars >= 3).length;
    case 'challenges': return recs.reduce((s, r) => s + r.challengeClears, 0);
    case 'world_bosses': {
      let n = 0;
      for (let w = 1; w <= WORLD_COUNT; w++) if (save.levels[levelId(w, LEVELS_PER_WORLD)]?.completed) n += 1;
      return n;
    }
    case 'skins_owned': {
      const c = save.inventory.characters.filter((id) => { const s = getCharacter(id); return !!s && !s.free; }).length;
      const w = save.inventory.weapons.filter((id) => { const s = getWeapon(id); return !!s && !s.free; }).length;
      return c + w;
    }
    case 'daily_claims': return save.daily.totalClaims;
    case 'kills': return save.lifetime.kills;
    case 'max_combo': return save.lifetime.maxCombo;
    case 'specials': return save.lifetime.specials;
    case 'blocks': return save.lifetime.blocks;
    case 'dodges': return save.lifetime.dodges;
  }
}

export const isClaimed = (save: SaveData, id: string): boolean => save.achievements.claimed.includes(id);
export const isReached = (save: SaveData, d: AchievementDef): boolean => metricValue(save, d.metric) >= d.target;

/** Pure and atomic. A second claim of the same id is refused and the SAME save comes back. */
export function claimAchievement(save: SaveData, id: string): { save: SaveData; result: AchievementClaim } {
  const fail = (reason: 'unknown' | 'already_claimed' | 'not_reached') => ({ save, result: { ok: false, reason } as AchievementClaim });
  const def = getAchievement(id);
  if (!def) return fail('unknown');
  if (isClaimed(save, id)) return fail('already_claimed');
  if (!isReached(save, def)) return fail('not_reached');
  const reward = rewardOf(def);
  return {
    save: { ...save, coins: save.coins + reward, achievements: { claimed: [...save.achievements.claimed, id] } },
    result: { ok: true, reward },
  };
}

export function claimableCount(save: SaveData): number {
  return ACHIEVEMENTS.filter((d) => !isClaimed(save, d.id) && isReached(save, d)).length;
}

/** Claimable first, then in progress (closest first), then claimed. */
export function sortedAchievements(save: SaveData): AchievementDef[] {
  const rank = (d: AchievementDef): number => {
    if (isClaimed(save, d.id)) return 3;
    if (isReached(save, d)) return 0;
    return 1 + (1 - Math.min(1, metricValue(save, d.metric) / d.target)); // 1..2, closer = lower
  };
  return [...ACHIEVEMENTS].sort((x, y) => rank(x) - rank(y));
}

/** Adds one finished run to the lifetime totals. Call exactly once per run (wins and defeats). */
export function applyRunStats(save: SaveData, stats: Stats, won: boolean): SaveData {
  const n = (v: number): number => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const L = save.lifetime;
  return {
    ...save,
    lifetime: {
      kills: L.kills + n(stats.kills),
      blocks: L.blocks + n(stats.blocks),
      dodges: L.dodges + n(stats.dodges),
      specials: L.specials + n(stats.specials),
      maxCombo: Math.max(L.maxCombo, n(stats.maxCombo)),
      runs: L.runs + 1,
      wins: L.wins + (won ? 1 : 0),
    },
  };
}