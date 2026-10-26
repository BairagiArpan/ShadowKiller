import { createArena, emptyInput, stepArena } from '../arena';
import { applyHit } from '../combat';
import {
  BOSSES, MOVES, advanceMove, buildBossDef, bossLabel, initBoss, phaseFor,
} from '../bosses';
import { MAX_ENEMIES, MIN_TELEGRAPH, MAX_ENEMY_DAMAGE } from '../constants';
import { it, expect, describe } from '@jest/globals';


const calm = () => 0.99;
const bossArena = (extra: object = {}, mini = false) =>
  createArena({ waves: [['boss']], world: 1, miniBoss: mini, ...extra }, calm);

describe('boss data', () => {
  it('has a design for each of the five worlds, with valid moves', () => {
    for (let w = 1; w <= 5; w++) {
      const def = BOSSES[w];
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.phases.length).toBeGreaterThanOrEqual(3);
      def.phases.forEach((ph) => ph.moves.forEach((m) => expect(MOVES[m]).toBeDefined()));
      expect(def.phases[0].threshold).toBe(1);
      for (let i = 1; i < def.phases.length; i++) {
        expect(def.phases[i].threshold).toBeLessThan(def.phases[i - 1].threshold);
      }
    }
  });

  it('keeps every move telegraphed (>= floor) and under the damage cap at base scaling', () => {
    for (let w = 1; w <= 5; w++) {
      BOSSES[w].phases.forEach((ph, pi) => {
        ph.moves.forEach((_, mi) => {
          const d = buildBossDef(w, pi, mi);
          expect(d.telegraph).toBeGreaterThanOrEqual(MIN_TELEGRAPH);
          expect(d.damage).toBeLessThanOrEqual(MAX_ENEMY_DAMAGE);
        });
      });
    }
  });

  it('gets harder phase by phase', () => {
    for (let w = 1; w <= 5; w++) {
      const p = BOSSES[w].phases;
      for (let i = 1; i < p.length; i++) {
        expect(p[i].dmg).toBeGreaterThanOrEqual(p[i - 1].dmg);
        expect(p[i].speed).toBeGreaterThanOrEqual(p[i - 1].speed);
      }
    }
  });
});

describe('move order is deterministic and repeats', () => {
  it('cycles through the phase move list', () => {
    const b = initBoss(3, false)!; // world 3 phase 1: bolt, slam
    expect(b.def.style).toBe('shot');
    advanceMove(b); expect(b.def.style).toBe('strike');
    advanceMove(b); expect(b.def.style).toBe('shot');
  });
});

describe('phase selection', () => {
  it('follows the HP thresholds', () => {
    const b = initBoss(1, false)!;
    expect(phaseFor(b, 1)).toBe(0);
    expect(phaseFor(b, 0.61)).toBe(0);
    expect(phaseFor(b, 0.6)).toBe(1);
    expect(phaseFor(b, 0.3)).toBe(2);
    expect(phaseFor(b, 0.01)).toBe(2);
  });
  it('mini-bosses stop at two phases', () => {
    const b = initBoss(1, true)!;
    expect(b.phaseCount).toBe(2);
    expect(phaseFor(b, 0.05)).toBe(1);
  });
  it('returns null for a world without a boss design', () => {
    expect(initBoss(9, false)).toBeNull();
  });
});

describe('boss in the arena', () => {
  it('enters phase 2 when HP crosses 60%, roars invulnerable, then fights again', () => {
    const a = bossArena();
    a.passive = true;
    const e = a.enemies[0];
    e.hp = e.maxHp * 0.55;
    stepArena(a, emptyInput());
    expect(e.boss!.phase).toBe(1);
    expect(e.boss!.roar).toBeGreaterThan(0);
    expect(a.events).toContain('boss_phase');
    expect(applyHit(e, 0, 10, 0)).toBe('ignored');
    a.passive = false;
    for (let i = 0; i < 80; i++) stepArena(a, emptyInput());
    expect(e.boss!.roar).toBeLessThanOrEqual(0);
  });

  it('jumps straight to the last phase on a big hit', () => {
    const a = bossArena();
    a.enemies[0].hp = a.enemies[0].maxHp * 0.2;
    stepArena(a, emptyInput());
    expect(a.enemies[0].boss!.phase).toBe(2);
  });

  it('summons a minion on entering a summoning phase when a slot is free', () => {
    const a = bossArena();
    a.passive = true;
    a.enemies[0].hp = a.enemies[0].maxHp * 0.55;
    stepArena(a, emptyInput());
    expect(a.enemies.length).toBe(2);
    expect(a.enemies[1].kind).toBe('melee');
  });

  it('never exceeds the enemy slot limit when summoning', () => {
    const a = createArena({ waves: [['boss', 'melee', 'melee', 'melee']], world: 1 }, calm);
    a.passive = true;
    a.enemies[0].hp = a.enemies[0].maxHp * 0.55;
    stepArena(a, emptyInput());
    expect(a.enemies.length).toBeLessThanOrEqual(MAX_ENEMIES);
  });

  it('shows its name and phase on the HUD label', () => {
    const a = bossArena();
    expect(bossLabel(a)).toContain('TEMPLE WARDEN');
    expect(bossLabel(a)).toContain('PHASE 1/3');
  });

  it('a mini-boss never goes past phase 2', () => {
    const a = bossArena({}, true);
    a.passive = true;
    a.enemies[0].hp = a.enemies[0].maxHp * 0.05;
    stepArena(a, emptyInput());
    expect(a.enemies[0].boss!.phase).toBe(1);
    expect(a.enemies[0].boss!.phaseCount).toBe(2);
  });

  it('without a world, the boss behaves like the plain stand-in (no scripting)', () => {
    const a = createArena({ waves: [['boss']] }, calm);
    expect(a.enemies[0].boss).toBeNull();
  });

  it('its slam hurts a standing player but respects the damage cap', () => {
    const a = bossArena({ scaling: { hp: 1, dmg: 10, speed: 1, telegraph: 1, boss: 1 } });
    a.enemies[0].x = a.player.x + 60;
    a.enemies[0].cooldown = 0;
    for (let i = 0; i < 120; i++) stepArena(a, emptyInput());
    expect(a.player.hp).toBeLessThan(a.player.maxHp);
    expect(a.player.hp).toBeGreaterThanOrEqual(a.player.maxHp - MAX_ENEMY_DAMAGE);
  });

  it('keeps wind-ups at or above the fairness floor even with extreme telegraph scaling', () => {
    const a = bossArena({ scaling: { hp: 1, dmg: 1, speed: 1, telegraph: 0.1, boss: 1 } });
    a.enemies[0].x = a.player.x + 80;
    a.enemies[0].cooldown = 0;
    let seen = false;
    for (let i = 0; i < 200 && !seen; i++) {
      stepArena(a, emptyInput());
      if (a.enemies[0].state === 'telegraph') {
        seen = true;
        expect(a.enemies[0].teleTime).toBeGreaterThanOrEqual(MIN_TELEGRAPH);
      }
    }
    expect(seen).toBe(true);
  });
});