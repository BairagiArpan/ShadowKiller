import { createArena, emptyInput, stepArena } from '../arena';
import { MOVE_SPEED } from '../constants';
import { NO_PERKS, combinePerks } from '../perks';
import { Input } from '../types';
import { describe, expect, it } from '@jest/globals';

const calm = () => 0.99;
const press = (p: Partial<Input>): Input => ({ ...emptyInput(), ...p });

describe('damage taken and walking speed', () => {
  it('damageTaken scales what an enemy strike does to the player', () => {
    const run = (mul: number) => {
      const a = createArena({ waves: [['melee']], perks: { ...NO_PERKS, damageTaken: mul } }, calm);
      a.enemies[0].x = a.player.x + 60;
      a.enemies[0].cooldown = 0;
      for (let i = 0; i < 60; i++) stepArena(a, emptyInput());
      return a.player.maxHp - a.player.hp;
    };
    expect(run(1)).toBeCloseTo(10);
    expect(run(0.5)).toBeCloseTo(5);
  });

  it('damageTaken also applies to hazards', () => {
    const run = (mul: number) => {
      const a = createArena({
        waves: [['melee']], perks: { ...NO_PERKS, damageTaken: mul },
        hazards: [{ kind: 'spikes', x: 150, w: 100, period: 3, offset: 0, damage: 8 }],
      }, calm);
      a.passive = true;
      a.player.x = 200;
      for (let i = 0; i < Math.round(2.6 * 60); i++) stepArena(a, emptyInput());
      return a.player.maxHp - a.player.hp;
    };
    expect(run(0.5)).toBeLessThan(run(1));
    expect(run(0.5)).toBeGreaterThan(0);
  });

  it('moveSpeed scales walking speed', () => {
    const a = createArena({ waves: [['melee']], perks: { ...NO_PERKS, moveSpeed: 1.1 } }, calm);
    a.passive = true;
    stepArena(a, press({ right: true }));
    expect(a.player.vx).toBeCloseTo(MOVE_SPEED * 1.1, 3);
  });
});

describe('combinePerks', () => {
  it('stacking nothing on nothing changes nothing', () => {
    expect(combinePerks(NO_PERKS, NO_PERKS)).toEqual(NO_PERKS);
  });
  it('multiplies multipliers and adds flat bonuses', () => {
    const a = { ...NO_PERKS, damage: 1.1, maxHp: 10, damageTaken: 0.9, blockReduction: 0.84 };
    const b = { ...NO_PERKS, damage: 1.2, maxHp: 5, damageTaken: 0.8, blockReduction: 0.8 };
    const c = combinePerks(a, b);
    expect(c.damage).toBeCloseTo(1.32);
    expect(c.maxHp).toBe(15);
    expect(c.damageTaken).toBeCloseTo(0.72);
    expect(c.blockReduction).toBeCloseTo(0.84);
  });
});