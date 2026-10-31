import { createArena, emptyInput, stepArena } from '../arena';
import { applyHit, createFighter } from '../combat';
import { NO_PERKS, specialCostFor } from '../perks';
import { Input } from '../types';
import { describe, expect, it } from '@jest/globals';

const calm = () => 0.99;
const press = (p: Partial<Input>): Input => ({ ...emptyInput(), ...p });

/** One heavy hit on a passive enemy; returns the arena afterwards. */
function heavyHit(perks?: Partial<typeof NO_PERKS>) {
  const a = createArena({ waves: [['melee']], perks: perks ? { ...NO_PERKS, ...perks } : undefined }, calm);
  a.passive = true;
  a.enemies[0].x = a.player.x + 60;
  stepArena(a, press({ heavy: true }));
  for (let i = 0; i < 40; i++) stepArena(a, emptyInput());
  return a;
}

describe('perks in the engine', () => {
  it('without perks everything behaves as before', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    expect(a.perks).toEqual(NO_PERKS);
    expect(a.player.maxHp).toBe(100);
    const hit = heavyHit();
    expect(hit.enemies[0].maxHp - hit.enemies[0].hp).toBeCloseTo(20);
  });

  it('adds max health', () => {
    const a = createArena({ waves: [['melee']], perks: { ...NO_PERKS, maxHp: 20 } }, calm);
    expect(a.player.maxHp).toBe(120);
    expect(a.player.hp).toBe(120);
  });

  it('scales attack damage', () => {
    const a = heavyHit({ damage: 1.5 });
    expect(a.enemies[0].maxHp - a.enemies[0].hp).toBeCloseTo(30);
  });

  it('scales energy gained from hits', () => {
    expect(heavyHit().energy).toBeCloseTo(12);
    expect(heavyHit({ energyGain: 1.5 }).energy).toBeCloseTo(18);
  });

  it('lowers the special cost, with a floor', () => {
    expect(specialCostFor(NO_PERKS)).toBe(50);
    expect(specialCostFor({ ...NO_PERKS, specialCostDown: 12 })).toBe(38);
    expect(specialCostFor({ ...NO_PERKS, specialCostDown: 999 })).toBe(30);

    const base = createArena({ waves: [['melee']] }, calm);
    base.energy = 40;
    stepArena(base, press({ special: true }));
    expect(base.player.state).not.toBe('special');

    const skilled = createArena({ waves: [['melee']], perks: { ...NO_PERKS, specialCostDown: 12 } }, calm);
    skilled.energy = 40;
    stepArena(skilled, press({ special: true }));
    expect(skilled.player.state).toBe('special');
    expect(skilled.energy).toBe(2);
  });

  it('scales special damage', () => {
    const run = (mul: number) => {
      const a = createArena({ waves: [['melee']], perks: { ...NO_PERKS, specialDamage: mul } }, calm);
      a.passive = true;
      a.enemies[0].x = a.player.x + 60;
      a.energy = 100;
      stepArena(a, press({ special: true }));
      for (let i = 0; i < 30; i++) stepArena(a, emptyInput());
      return a.enemies[0].maxHp - a.enemies[0].hp;
    };
    expect(run(1.3)).toBeGreaterThan(run(1));
  });

  it('extends dodge invulnerability', () => {
    const base = createArena({ waves: [['melee']] }, calm);
    stepArena(base, press({ dodge: true }));
    const skilled = createArena({ waves: [['melee']], perks: { ...NO_PERKS, dodgeInvuln: 0.1 } }, calm);
    stepArena(skilled, press({ dodge: true }));
    expect(skilled.player.invuln - base.player.invuln).toBeCloseTo(0.1, 3);
  });

  it('improves blocking against melee hits', () => {
    const block = (reduction?: number) => {
      const f = createFighter(300, -1, 100);
      f.state = 'block';
      applyHit(f, 200, 20, 100, reduction === undefined ? {} : { blockReduction: reduction });
      return f.hp;
    };
    expect(block()).toBeCloseTo(96);
    expect(block(0.9)).toBeCloseTo(98);
  });
});