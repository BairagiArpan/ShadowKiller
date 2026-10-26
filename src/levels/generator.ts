import { MAX_HAZARDS, WORLD_W } from '../engine/constants';
import { ENEMY_DEFS } from '../engine/enemies';
import { HAZARD_BASE } from '../engine/hazards';
import type { EnemyKind, EnemyScaling, Hazard, HazardKind } from '../engine/types';
import { levelBaseReward } from '../economy/economy.config';
import { LEVELS_PER_WORLD, MINI_BOSS_LEVELS, WORLD_COUNT, levelId, tierOf } from './common';
import type { LevelConfig, Objective, ObjectiveKind, Tier } from './types';
import { WORLDS } from './worlds';

type Pool = { kind: Exclude<EnemyKind, 'boss'>; from: number; weight: number }[];

const THREAT: Record<EnemyKind, number> = {
  melee: 1, ranged: 1.1, assassin: 1.2, tank: 2.2, elite: 2.4, boss: 5,
};
const HEAL_BY_TIER: Record<Tier, number> = {
  easy: 0.3, normal: 0.2, medium: 0.15, hard: 0.1, very_hard: 0.05, extreme: 0, boss: 0.1,
};
const r2 = (n: number) => Math.round(n * 100) / 100;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function waveCountFor(level: number, tier: Tier, world: number, miniBoss: boolean): number {
  let n: number;
  switch (tier) {
    case 'easy': n = 1 + Math.floor((level - 1) / 7); break;
    case 'normal': n = level <= 30 ? 2 : 3; break;
    case 'medium': n = 3; break;
    case 'hard': n = level <= 70 ? 3 : 4; break;
    case 'very_hard': n = miniBoss ? 2 : 4; break;
    case 'extreme': n = 4; break;
    default: n = 3; break; // boss: regular waves before the boss wave
  }
  if (world >= 4 && tier !== 'easy' && n < 4) n += 1;
  return n;
}

function maxWaveSize(tier: Tier, level: number): number {
  if (tier === 'easy') return level < 6 ? 1 : 2;
  if (tier === 'normal' || tier === 'medium') return 3;
  return 4;
}

function buildWave(
  rng: () => number, pool: Pool, budget: number, maxSize: number,
  forced: EnemyKind[], minSize: number,
): EnemyKind[] {
  const wave: EnemyKind[] = forced.slice(0, maxSize);
  let left = budget - wave.reduce((s, k) => s + THREAT[k], 0);
  const total = pool.reduce((s, r) => s + r.weight, 0);
  let guard = 0;
  while (wave.length < maxSize && guard++ < 12) {
    let roll = rng() * total;
    let pick = pool[0];
    for (const r of pool) { roll -= r.weight; if (roll <= 0) { pick = r; break; } }
    if (wave.length === 0 || THREAT[pick.kind] <= left + 0.3) {
      wave.push(pick.kind); left -= THREAT[pick.kind];
    } else if (left < 0.9) break;
  }
  const cheapest = pool.reduce((m, r) => (THREAT[r.kind] < THREAT[m.kind] ? r : m), pool[0]).kind;
  while (wave.length < minSize) wave.push(cheapest);
  return wave;
}

function buildHazards(
  rng: () => number, world: number, level: number, scaling: EnemyScaling,
): Hazard[] {
  const wd = WORLDS[world - 1];
  const avail = wd.hazards.filter((h) => level >= h.from);
  if (avail.length === 0) return [];
  const minFrom = Math.min(...avail.map((h) => h.from));
  const count = Math.min(MAX_HAZARDS, level >= minFrom + 30 ? 2 : 1);
  const placed: Hazard[] = [];
  for (let n = 0; n < count; n++) {
    let pool = avail;
    if (n > 0 && avail.length > 1) pool = avail.filter((h) => h.kind !== placed[0].kind);
    const kind: HazardKind = pool[Math.floor(rng() * pool.length)].kind;
    const w = 70 + Math.floor(rng() * 50);
    let x = 0; let ok = false;
    for (let tries = 0; tries < 10 && !ok; tries++) {
      x = Math.round(280 + rng() * (WORLD_W - 40 - w - 280));
      ok = placed.every((h) => x > h.x + h.w + 30 || x + w + 30 < h.x);
    }
    if (!ok) continue;
    const base = HAZARD_BASE[kind];
    placed.push({
      kind, x, w, period: base.period,
      offset: Math.round(rng() * base.period * 10) / 10,
      damage: Math.round(base.damage * (0.7 + 0.3 * scaling.dmg)),
    });
  }
  return placed;
}

export function generateLevel(world: number, level: number, salt = 0): LevelConfig {
  const wd = WORLDS[world - 1];
  const rng = mulberry32(world * 100003 + level * 7919 + salt * 104729 + 12345);
  const tier = tierOf(level);
  const worldBoss = level === LEVELS_PER_WORLD;
  const miniBoss = MINI_BOSS_LEVELS.includes(level);

  const p = (level - 1) / (LEVELS_PER_WORLD - 1);
  const S = 0.6 * p + 0.4 * ((world - 1) / (WORLD_COUNT - 1));
  const scaling: EnemyScaling = {
    hp: r2(0.8 + 1.9 * S),
    dmg: r2(Math.min(2.2, 0.8 + 1.4 * S)),
    speed: r2(0.9 + 0.35 * S),
    telegraph: r2(1.3 - 0.55 * S),
    boss: miniBoss ? 0.5 : 1,
  };

  const pool: Pool = wd.roster.filter((r) => level >= r.from);
  const has = (k: EnemyKind) => pool.some((r) => r.kind === k);
  const baseBudget = 1.0 + 4.0 * p + 0.45 * (world - 1);
  const nWaves = waveCountFor(level, tier, world, miniBoss);
  const maxSize = maxWaveSize(tier, level);

  const waves: EnemyKind[][] = [];
  for (let i = 0; i < nWaves; i++) {
    const frac = nWaves > 1 ? i / (nWaves - 1) : 1;
    let budget = baseBudget * (0.8 + 0.4 * frac);
    if (tier === 'extreme') budget *= 1.25;
    const forced: EnemyKind[] = [];
    if (i === nWaves - 1 && level >= 61) {
      if (has('elite')) forced.push('elite');
      if (tier === 'extreme' && has('tank')) forced.push('tank');
    }
    const minSize = tier === 'easy' ? (level < 6 ? 1 : level < 13 ? (rng() < 0.5 ? 1 : 2) : 2) : 1;
    waves.push(buildWave(rng, pool, budget, maxSize, forced, minSize));
  }
  if (worldBoss) waves.push(['boss', ...wd.bossGuards]);
  else if (miniBoss) waves.push(['boss', pool[Math.floor(rng() * pool.length)].kind]);

  const hazards = buildHazards(rng, world, level, scaling);

  const hpOf = (k: EnemyKind) => ENEMY_DEFS[k].maxHp * scaling.hp * (k === 'boss' ? scaling.boss : 1);
  const totalHp = Math.round(waves.reduce((s, w) => s + w.reduce((t, k) => t + hpOf(k), 0), 0));
  const parTime = Math.round(12 + totalHp / 7 + 4 * waves.length);
  const expectedHits = totalHp / 9;

  const kinds: ObjectiveKind[] = ['combo', 'speed', 'health'];
  const kind: ObjectiveKind = level <= 2 ? 'health' : kinds[Math.floor(rng() * kinds.length)];
  let objective: Objective;
  if (kind === 'combo') {
    const target = Math.min(25, Math.max(3, Math.round(expectedHits * 0.4)));
    objective = { kind, target, label: `Reach a ${target}-hit combo` };
  } else if (kind === 'speed') {
    objective = { kind, target: parTime, label: `Win within ${parTime}s` };
  } else {
    const target = r2(0.45 + 0.3 * S);
    objective = { kind, target, label: `Finish with ${Math.round(target * 100)}% health` };
  }

  return {
    id: levelId(world, level), world, level, tier, waves, hazards, scaling,
    healPerWave: r2(Math.max(0, HEAL_BY_TIER[tier] - 0.03 * (world - 1))),
    objective, miniBoss, worldBoss, parTime, totalHp,
    baseReward: levelBaseReward(world, level, tier, miniBoss),
  };
}

/** Structure only (waves + hazard layout). Used to check that levels are really different. */
export function structureSignature(c: LevelConfig): string {
  return JSON.stringify([c.waves, c.hazards.map((h) => [h.kind, h.x, h.w])]);
}