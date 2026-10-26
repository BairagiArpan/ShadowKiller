import { MAX_ENEMY_DAMAGE } from '../engine/constants';
import { LEVELS_PER_WORLD, WORLD_COUNT } from './common';
import { generateLevel, structureSignature } from './generator';
import type { LevelConfig } from './types';
import { WORLDS } from './worlds';

const cache = new Map<number, LevelConfig[]>();
const MAX_DMG_MUL = MAX_ENEMY_DAMAGE / 25; // 25 = strongest base enemy hit (boss)

/** Generates (once) and returns all 100 levels of a world. Deterministic. */
export function getWorldLevels(world: number): LevelConfig[] {
  if (!Number.isInteger(world) || world < 1 || world > WORLD_COUNT) throw new RangeError(`bad world ${world}`);
  const hit = cache.get(world);
  if (hit) return hit;
  const out: LevelConfig[] = [];
  for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
    let cfg = generateLevel(world, level, 0);
    const prev = out[level - 2];
    // Re-roll (different salt) if this level would repeat its neighbour's structure.
    for (let salt = 1; prev && salt <= 24 && structureSignature(cfg) === structureSignature(prev); salt++) {
      cfg = generateLevel(world, level, salt);
    }
    out.push(cfg);
  }
  cache.set(world, out);
  return out;
}

export function getLevel(world: number, level: number): LevelConfig {
  if (!Number.isInteger(level) || level < 1 || level > LEVELS_PER_WORLD) throw new RangeError(`bad level ${level}`);
  return getWorldLevels(world)[level - 1];
}

/** Optional hard mode: tougher enemies, no healing, same readable telegraphs. */
export function applyChallenge(cfg: LevelConfig): LevelConfig {
  const c = WORLDS[cfg.world - 1].challenge;
  return {
    ...cfg,
    scaling: {
      ...cfg.scaling,
      hp: Math.round(cfg.scaling.hp * c.hp * 100) / 100,
      dmg: Math.round(Math.min(MAX_DMG_MUL, cfg.scaling.dmg * c.dmg) * 100) / 100,
    },
    healPerWave: 0,
  };
}