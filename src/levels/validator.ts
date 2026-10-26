import { MAX_ENEMIES, MAX_ENEMY_DAMAGE, MAX_HAZARDS, MIN_TELEGRAPH, WORLD_W } from '../engine/constants';
import { ENEMY_DEFS } from '../engine/enemies';
import { LEVELS_PER_WORLD, WORLD_COUNT, levelId } from './common';
import { structureSignature } from './generator';
import { getWorldLevels } from './index';
import type { LevelConfig } from './types';
import { WORLDS } from './worlds';

export const MIN_DISTINCT_STRUCTURES_PER_WORLD = 40;

/** Returns a list of problems (empty = valid). */
export function validateLevel(c: LevelConfig): string[] {
  const errs: string[] = [];
  const bad = (m: string) => errs.push(`${c.id}: ${m}`);
  const wd = WORLDS[c.world - 1];
  if (!wd) { bad('unknown world'); return errs; }
  if (c.id !== levelId(c.world, c.level)) bad('id does not match world/level');
  if (c.waves.length < 1 || c.waves.length > 5) bad(`wave count ${c.waves.length} not in 1..5`);

  c.waves.forEach((w, wi) => {
    if (w.length < 1 || w.length > MAX_ENEMIES) bad(`wave ${wi + 1} has ${w.length} enemies`);
    w.forEach((k) => {
      if (!ENEMY_DEFS[k]) { bad(`unknown enemy ${k}`); return; }
      if (k === 'boss') {
        if (!(c.miniBoss || c.worldBoss)) bad('boss in a non-boss level');
        if (wi !== c.waves.length - 1) bad('boss outside the final wave');
        return;
      }
      const entry = wd.roster.find((r) => r.kind === k);
      if (!entry || entry.from > c.level) bad(`${k} used before its unlock level`);
    });
  });

  if (c.worldBoss !== (c.level === LEVELS_PER_WORLD)) bad('worldBoss flag wrong');
  const hasBoss = c.waves.some((w) => w.includes('boss'));
  if (hasBoss !== (c.miniBoss || c.worldBoss)) bad('boss presence does not match flags');

  if (c.hazards.length > MAX_HAZARDS) bad('too many hazards');
  for (const h of c.hazards) {
    if (h.x < 260 || h.x + h.w > WORLD_W) bad('hazard outside safe placement range');
    if (!wd.hazards.some((d) => d.kind === h.kind && c.level >= d.from)) bad(`hazard ${h.kind} not allowed here`);
  }

  const kindsHere = new Set(c.waves.flat());
  kindsHere.forEach((k) => {
    const d = ENEMY_DEFS[k];
    if (d.telegraph * c.scaling.telegraph < MIN_TELEGRAPH - 1e-9) bad(`${k} telegraph below fairness floor`);
    if (d.damage * c.scaling.dmg > MAX_ENEMY_DAMAGE + 1e-9) bad(`${k} hit exceeds damage cap`);
  });

  if (c.scaling.hp <= 0 || c.scaling.speed <= 0) bad('non-positive scaling');
  if (c.healPerWave < 0 || c.healPerWave > 0.5) bad('healPerWave out of range');
  if (c.baseReward <= 0) bad('non-positive reward');

  const o = c.objective;
  if (o.kind === 'combo' && (o.target < 3 || o.target > 25 || o.target > Math.max(3, Math.floor((c.totalHp / 9) * 0.6)))) {
    bad(`combo target ${o.target} unreachable`);
  }
  if (o.kind === 'speed' && o.target < 10) bad('speed target too tight');
  if (o.kind === 'health' && (o.target < 0.3 || o.target > 0.9)) bad('health target out of range');
  return errs;
}

export function validateWorld(world: number): string[] {
  const errs: string[] = [];
  const levels = getWorldLevels(world);
  if (levels.length !== LEVELS_PER_WORLD) errs.push(`world ${world}: ${levels.length} levels`);
  const ids = new Set(levels.map((l) => l.id));
  if (ids.size !== levels.length) errs.push(`world ${world}: duplicate ids`);

  levels.forEach((l, i) => {
    errs.push(...validateLevel(l));
    const prev = levels[i - 1];
    if (prev) {
      if (l.scaling.hp < prev.scaling.hp) errs.push(`${l.id}: HP scaling decreased`);
      if (l.level > 20 && structureSignature(l) === structureSignature(prev)) {
        errs.push(`${l.id}: same structure as previous level`);
      }
    }
  });

  const distinct = new Set(levels.map(structureSignature)).size;
  if (distinct < MIN_DISTINCT_STRUCTURES_PER_WORLD) {
    errs.push(`world ${world}: only ${distinct} distinct level structures`);
  }
  return errs;
}

export function validateAll(): string[] {
  const errs: string[] = [];
  for (let w = 1; w <= WORLD_COUNT; w++) errs.push(...validateWorld(w));
  for (let w = 1; w < WORLD_COUNT; w++) {
    for (const lv of [1, 50, 100]) {
      if (getWorldLevels(w + 1)[lv - 1].scaling.hp <= getWorldLevels(w)[lv - 1].scaling.hp) {
        errs.push(`world ${w + 1} level ${lv} is not harder than world ${w}`);
      }
    }
  }
  return errs;
}