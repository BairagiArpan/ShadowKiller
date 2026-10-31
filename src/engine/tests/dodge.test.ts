import { createArena, emptyInput, stepArena } from '../arena';
import { DODGE_COOLDOWN } from '../constants';
import { Input } from '../types';
import { describe, expect, it } from '@jest/globals';

const calm = () => 0.99;
const press = (p: Partial<Input>): Input => ({ ...emptyInput(), ...p });

describe('dodge cooldown', () => {
  it('mashing dodge starts a dodge about once per cooldown, not once per dodge', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.passive = true;
    let starts = 0;
    let prev = a.player.state;
    for (let i = 0; i < 90; i++) { // 1.5 seconds
      stepArena(a, press({ dodge: true }));
      if (a.player.state === 'dodge' && prev !== 'dodge') starts += 1;
      prev = a.player.state;
    }
    expect(starts).toBeGreaterThanOrEqual(2);
    expect(starts).toBeLessThanOrEqual(Math.ceil(1.5 / DODGE_COOLDOWN) + 1);
  });

  it('a single dodge still gives full invulnerability', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    stepArena(a, press({ dodge: true }));
    expect(a.player.state).toBe('dodge');
    expect(a.player.invuln).toBeGreaterThan(0.2);
  });

  it('spamming dodge next to an enemy no longer makes the player untouchable', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.enemies[0].x = a.player.x + 60;
    a.enemies[0].cooldown = 0;
    for (let i = 0; i < 1200 && !a.over; i++) stepArena(a, press({ dodge: true }));
    expect(a.player.hp).toBeLessThan(a.player.maxHp);
  });

  it('dodging again is allowed once the cooldown has passed', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.passive = true;
    stepArena(a, press({ dodge: true }));
    for (let i = 0; i < Math.ceil(DODGE_COOLDOWN * 60) + 20; i++) stepArena(a, emptyInput());
    stepArena(a, press({ dodge: true }));
    expect(a.player.state).toBe('dodge');
  });
});