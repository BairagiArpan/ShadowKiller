import { createArena, emptyInput, stepArena } from '../arena';
import { GROUND_Y, MOVE_SPEED } from '../constants';
import { createEnemy, enemyDamage, ENEMY_DEFS } from '../enemies';
import { hazardBox, hazardPhase } from '../hazards';
import { hurtbox, rectsOverlap } from '../combat';
import { Hazard, Input } from '../types';
import { describe, expect, it } from '@jest/globals';

const calm = () => 0.99;
const press = (p: Partial<Input>): Input => ({ ...emptyInput(), ...p });
const spikes: Hazard = { kind: 'spikes', x: 150, w: 100, period: 3, offset: 0, damage: 6 };

describe('hazard cycle', () => {
  it('is dormant, then warns for at least 0.9s, then fires', () => {
    expect(hazardPhase(spikes, 0.5)).toBe(0);
    expect(hazardPhase(spikes, 1.6)).toBe(1);
    expect(hazardPhase(spikes, 2.5)).toBe(2);
    expect(hazardPhase(spikes, 3.2)).toBe(0); // next cycle
  });
  it('ice is always on but never damages', () => {
    expect(hazardPhase({ ...spikes, kind: 'ice' }, 0.1)).toBe(2);
  });
});

describe('hazard damage', () => {
  it('hurts a grounded player standing in an active zone', () => {
    const a = createArena({ waves: [['melee']], hazards: [spikes] }, calm);
    a.passive = true;
    a.player.x = 200;
    for (let i = 0; i < Math.round(2.6 * 60); i++) stepArena(a, emptyInput());
    expect(a.player.hp).toBeLessThan(a.player.maxHp);
  });

  it('does nothing while the zone is only warning', () => {
    const a = createArena({ waves: [['melee']], hazards: [spikes] }, calm);
    a.passive = true;
    a.player.x = 200;
    for (let i = 0; i < Math.round(2.0 * 60); i++) stepArena(a, emptyInput());
    expect(a.player.hp).toBe(a.player.maxHp);
  });

  it('a jumping fighter is above the strip (airborne players are safe)', () => {
    const grounded = { x: 200, y: GROUND_Y, w: 0 };
    const airborne = { x: 200, y: GROUND_Y - 20, w: 0 };
    const fighter = (y: number) => ({ ...createArenaPlayer(), y });
    expect(rectsOverlap(hazardBox(spikes), hurtbox(fighter(grounded.y)))).toBe(true);
    expect(rectsOverlap(hazardBox(spikes), hurtbox(fighter(airborne.y)))).toBe(false);
  });
});

function createArenaPlayer() {
  const a = createArena({ waves: [['melee']] }, calm);
  return { ...a.player, x: 200 };
}

describe('ice', () => {
  const ice: Hazard = { kind: 'ice', x: 100, w: 400, period: 1, offset: 0, damage: 0 };
  it('accelerates gradually and keeps sliding after input stops', () => {
    const a = createArena({ waves: [['melee']], hazards: [ice] }, calm);
    a.passive = true;
    for (let i = 0; i < 5; i++) stepArena(a, press({ right: true }));
    expect(a.player.vx).toBeLessThan(MOVE_SPEED * 0.5);
    for (let i = 0; i < 25; i++) stepArena(a, press({ right: true }));
    stepArena(a, emptyInput());
    expect(a.player.vx).toBeGreaterThan(100);
  });
  it('without ice, movement is instant', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.passive = true;
    stepArena(a, press({ right: true }));
    expect(a.player.vx).toBe(MOVE_SPEED);
  });
});

describe('level scaling in the engine', () => {
  const scaling = { hp: 2, dmg: 2, speed: 1, telegraph: 1, boss: 1 };

  it('scales enemy HP and the damage they deal', () => {
    const a = createArena({ waves: [['melee']], scaling }, calm);
    expect(a.enemies[0].maxHp).toBe(120);
    a.enemies[0].x = a.player.x + 60;
    a.enemies[0].cooldown = 0;
    for (let i = 0; i < 60; i++) stepArena(a, emptyInput());
    expect(a.player.hp).toBe(80); // one 10 x 2 = 20 damage strike
  });

  it('never lets a wind-up drop below the fairness floor', () => {
    const e = createEnemy('assassin', 600, 0, undefined, { ...scaling, telegraph: 0.3 });
    expect(e.teleTime).toBeGreaterThanOrEqual(0.25);
  });

  it('caps a single hit', () => {
    const e = createEnemy('boss', 600, 0, undefined, { ...scaling, dmg: 10 });
    expect(enemyDamage(e, ENEMY_DEFS.boss)).toBeLessThanOrEqual(60);
  });

  it('applies the boss HP multiplier only to bosses', () => {
    const half = { ...scaling, hp: 1, boss: 0.5 };
    expect(createEnemy('boss', 600, 0, undefined, half).maxHp).toBe(200);
    expect(createEnemy('melee', 600, 0, undefined, half).maxHp).toBe(60);
  });
});

describe('healing between waves', () => {
  it('restores a fraction of max HP when the next wave spawns', () => {
    const a = createArena({ waves: [['melee'], ['melee']], healPerWave: 0.5 }, calm);
    a.player.hp = 40;
    a.enemies[0].state = 'dead';
    for (let i = 0; i < 70; i++) stepArena(a, emptyInput());
    expect(a.wave).toBe(2);
    expect(a.player.hp).toBe(90);
  });
});