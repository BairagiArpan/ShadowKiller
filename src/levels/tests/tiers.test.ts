import { WORLD_COUNT } from '../common';
import { getWorldLevels } from '../index';
import { describe, expect, it } from '@jest/globals'

/** Earliest level each enemy type may appear in, in every world (from the original difficulty brief). */
const FIRST_LEVEL: Record<string, number> = { melee: 1, ranged: 11, assassin: 21, tank: 21, elite: 41 };

describe('enemy unlock rules apply to every world', () => {
  it('no enemy type appears before its earliest level', () => {
    for (let w = 1; w <= WORLD_COUNT; w++) {
      for (const cfg of getWorldLevels(w)) {
        for (const kind of new Set(cfg.waves.flat())) {
          if (kind === 'boss') continue;
          expect({ id: cfg.id, kind, ok: cfg.level >= FIRST_LEVEL[kind] }).toEqual({ id: cfg.id, kind, ok: true });
        }
      }
    }
  });

  it('levels 1 to 10 use only basic melee enemies, and levels 1 to 20 have no tanks, assassins or elites', () => {
    for (let w = 1; w <= WORLD_COUNT; w++) {
      for (const cfg of getWorldLevels(w).slice(0, 20)) {
        const kinds = new Set(cfg.waves.flat());
        if (cfg.level <= 10) expect(kinds).toEqual(new Set(['melee']));
        ['tank', 'assassin', 'elite', 'boss'].forEach((k) => expect(kinds.has(k as never)).toBe(false));
      }
    }
  });

  it('elites are not common before level 61 in worlds 1 to 3', () => {
    for (let w = 1; w <= 3; w++) {
      getWorldLevels(w).filter((l) => l.level < 51).forEach((l) => expect(l.waves.flat()).not.toContain('elite'));
    }
  });
});