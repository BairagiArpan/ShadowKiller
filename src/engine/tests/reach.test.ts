import { createArena, emptyInput, stepArena } from '../arena';
import { NO_PERKS } from '../perks';
import { Input } from '../types';
import {describe, expect, it} from '@jest/globals';

const calm = () => 0.99;
const press = (p: Partial<Input>): Input => ({ ...emptyInput(), ...p });

/** One light attack at an enemy just beyond normal reach (hit box ends at x=290, enemy body starts at x=310). */
function lightAtDistance(reach: number) {
  const a = createArena({ waves: [['melee']], perks: { ...NO_PERKS, reach } }, calm);
  a.passive = true;
  a.enemies[0].x = 330;
  stepArena(a, press({ light: true }));
  for (let i = 0; i < 30; i++) stepArena(a, emptyInput());
  return a.enemies[0].maxHp - a.enemies[0].hp;
}

describe('attack reach perk', () => {
  it('normal reach cannot hit an enemy that is just out of range', () => {
    expect(lightAtDistance(1)).toBe(0);
  });
  it('extended reach hits the same enemy', () => {
    expect(lightAtDistance(1.5)).toBeGreaterThan(0);
  });
  it('the default perks do not change reach', () => {
    expect(NO_PERKS.reach).toBe(1);
  });
});