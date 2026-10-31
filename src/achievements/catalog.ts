import { ACHIEVEMENT_REWARDS } from '../economy/economy.config';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type Metric =
  | 'levels_cleared' | 'stars' | 'three_stars' | 'world_bosses' | 'challenges' | 'skins_owned'
  | 'daily_claims' | 'kills' | 'max_combo' | 'specials' | 'blocks' | 'dodges';

export interface AchievementDef {
  id: string; name: string; desc: string; metric: Metric; target: number; tier: AchievementTier;
}

const a = (
  id: string, name: string, desc: string, metric: Metric, target: number, tier: AchievementTier,
): AchievementDef => ({ id, name, desc, metric, target, tier });

export const ACHIEVEMENTS: AchievementDef[] = [
  a('first_blood', 'First Blood', 'Clear your first level', 'levels_cleared', 1, 'bronze'),
  a('wanderer', 'Wanderer', 'Clear 25 levels', 'levels_cleared', 25, 'bronze'),
  a('veteran', 'Veteran', 'Clear 100 levels', 'levels_cleared', 100, 'silver'),
  a('centurion', 'Centurion', 'Clear 250 levels', 'levels_cleared', 250, 'gold'),
  a('conqueror', 'Conqueror', 'Clear all 500 levels', 'levels_cleared', 500, 'platinum'),

  a('star_seeker', 'Star Seeker', 'Earn 30 stars', 'stars', 30, 'bronze'),
  a('star_collector', 'Star Collector', 'Earn 150 stars', 'stars', 150, 'silver'),
  a('star_hoarder', 'Star Hoarder', 'Earn 500 stars', 'stars', 500, 'gold'),
  a('star_master', 'Star Master', 'Earn 1000 stars', 'stars', 1000, 'platinum'),

  a('perfectionist', 'Perfectionist', 'Get 3 stars on 25 levels', 'three_stars', 25, 'silver'),
  a('untouchable', 'Untouchable', 'Get 3 stars on 100 levels', 'three_stars', 100, 'gold'),

  a('boss_slayer', 'Boss Slayer', 'Defeat a world boss', 'world_bosses', 1, 'silver'),
  a('world_breaker', 'World Breaker', 'Defeat 3 world bosses', 'world_bosses', 3, 'gold'),
  a('void_conqueror', 'Void Conqueror', 'Defeat all 5 world bosses', 'world_bosses', 5, 'platinum'),

  a('slayer', 'Slayer', 'Defeat 50 enemies', 'kills', 50, 'bronze'),
  a('hunter', 'Hunter', 'Defeat 500 enemies', 'kills', 500, 'silver'),
  a('reaper', 'Reaper', 'Defeat 2500 enemies', 'kills', 2500, 'gold'),

  a('combo_10', 'Combo Starter', 'Land a 10-hit combo', 'max_combo', 10, 'bronze'),
  a('combo_25', 'Combo Artist', 'Land a 25-hit combo', 'max_combo', 25, 'silver'),
  a('combo_40', 'Combo Legend', 'Land a 40-hit combo', 'max_combo', 40, 'gold'),

  a('spark', 'Spark', 'Use the special ability 10 times', 'specials', 10, 'bronze'),
  a('stormbringer', 'Stormbringer', 'Use the special ability 100 times', 'specials', 100, 'silver'),

  a('guardian', 'Guardian', 'Block 50 attacks', 'blocks', 50, 'bronze'),
  a('iron_wall', 'Iron Wall', 'Block 250 attacks', 'blocks', 250, 'silver'),
  a('ghost', 'Ghost', 'Dodge 50 attacks', 'dodges', 50, 'bronze'),
  a('phantom', 'Phantom', 'Dodge 250 attacks', 'dodges', 250, 'silver'),

  a('challenger', 'Challenger', 'Clear a level in Challenge mode', 'challenges', 1, 'silver'),
  a('nightmare', 'Nightmare', 'Clear 20 Challenge runs', 'challenges', 20, 'gold'),

  a('new_look', 'New Look', 'Own 1 purchased skin', 'skins_owned', 1, 'bronze'),
  a('wardrobe', 'Wardrobe', 'Own 10 purchased skins', 'skins_owned', 10, 'silver'),
  a('collector', 'Collector', 'Own 25 purchased skins', 'skins_owned', 25, 'gold'),

  a('regular', 'Regular', 'Claim 7 daily rewards', 'daily_claims', 7, 'bronze'),
  a('devoted', 'Devoted', 'Claim 30 daily rewards', 'daily_claims', 30, 'silver'),
  a('dedicated', 'Dedicated', 'Claim 100 daily rewards', 'daily_claims', 100, 'gold'),
];

const byId = new Map(ACHIEVEMENTS.map((x) => [x.id, x]));
export const getAchievement = (id: string): AchievementDef | undefined => byId.get(id);
export const rewardOf = (d: AchievementDef): number => ACHIEVEMENT_REWARDS[d.tier];