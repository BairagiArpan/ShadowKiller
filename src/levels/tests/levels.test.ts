import { MAX_ENEMY_DAMAGE } from '../../engine/constants';
import { LEVELS_PER_WORLD, WORLD_COUNT } from '../common';
import { applyChallenge, getLevel, getWorldLevels } from '../index';
import { structureSignature } from '../generator';
import { MIN_DISTINCT_STRUCTURES_PER_WORLD, validateAll } from '../validator';
import { describe, it,expect } from '@jest/globals';

describe('level data', () => {
  it('has 5 worlds x 100 uniquely addressable levels', () => {
    const ids = new Set<string>();
    for (let w = 1; w <= WORLD_COUNT; w++) {
      const lv = getWorldLevels(w);
      expect(lv).toHaveLength(LEVELS_PER_WORLD);
      lv.forEach((l) => ids.add(l.id));
    }
    expect(ids.size).toBe(500);
  });

  it('passes the full validator (fairness caps, roster unlocks, boss rules, objectives)', () => {
    expect(validateAll()).toEqual([]);
  });

  it('is deterministic', () => {
    expect(JSON.stringify(getLevel(3, 57))).toBe(JSON.stringify(getLevel(3, 57)));
  });

  it('every world has real structural variety', () => {
    for (let w = 1; w <= WORLD_COUNT; w++) {
      const distinct = new Set(getWorldLevels(w).map(structureSignature)).size;
      expect(distinct).toBeGreaterThanOrEqual(MIN_DISTINCT_STRUCTURES_PER_WORLD);
    }
  });

  it('follows the tier rules for the boss and mini-boss levels', () => {
    for (let w = 1; w <= WORLD_COUNT; w++) {
      const boss = getLevel(w, 100);
      expect(boss.worldBoss).toBe(true);
      expect(boss.waves[boss.waves.length - 1][0]).toBe('boss');
      for (const l of [85, 90, 95]) expect(getLevel(w, l).miniBoss).toBe(true);
      expect(getLevel(w, 84).waves.flat()).not.toContain('boss');
    }
  });

  it('keeps levels 1-20 free of hazards and World 1 easy levels melee-only', () => {
    for (let l = 1; l <= 20; l++) {
      expect(getLevel(1, l).hazards).toHaveLength(0);
      expect(new Set(getLevel(1, l).waves.flat())).toEqual(new Set(['melee']));
    }
  });

  it('uses the world hazards from their configured level', () => {
    expect(getLevel(3, 10).hazards).toHaveLength(0);
    expect(getLevel(3, 11).hazards.some((h) => h.kind === 'ice')).toBe(true);
    expect(getLevel(4, 21).hazards.some((h) => h.kind === 'lava')).toBe(true);
  });

  it('gets harder across levels and across worlds', () => {
    expect(getLevel(1, 100).scaling.hp).toBeGreaterThan(getLevel(1, 1).scaling.hp);
    expect(getLevel(1, 100).scaling.telegraph).toBeLessThan(getLevel(1, 1).scaling.telegraph);
    expect(getLevel(5, 1).scaling.hp).toBeGreaterThan(getLevel(1, 1).scaling.hp);
    expect(getLevel(5, 100).scaling.dmg).toBeGreaterThan(getLevel(2, 100).scaling.dmg);
  });

  it('challenge mode is tougher but keeps telegraphs and the damage cap', () => {
    const base = getLevel(5, 50);
    const c = applyChallenge(base);
    expect(c.scaling.hp).toBeGreaterThan(base.scaling.hp);
    expect(c.scaling.telegraph).toBe(base.scaling.telegraph);
    expect(c.scaling.dmg * 25).toBeLessThanOrEqual(MAX_ENEMY_DAMAGE + 1e-9);
    expect(c.healPerWave).toBe(0);
  });

  it('rejects out-of-range addresses', () => {
    expect(() => getLevel(6, 1)).toThrow();
    expect(() => getLevel(1, 101)).toThrow();
  });
});