/////<reference types="jest" />
import { describe, expect, it } from "@jest/globals";
import { createArena, emptyInput, stepArena } from '../arena';
import { applyHit } from '../combat';
import { Input } from '../types';   

const calm = () => 0.99; // never rolls a block
const press = (p: Partial<Input>): Input => ({ ...emptyInput(), ...p });

describe('player', () => {
  it('dodge grants invulnerability frames', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    stepArena(a, press({ dodge: true }));
    expect(a.player.state).toBe('dodge');
    expect(applyHit(a.player, a.enemies[0].x, 10, 0)).toBe('ignored');
  });

  it('a heavy attack in range damages the enemy through the real simulation', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.enemies[0].x = a.player.x + 60;
    stepArena(a, press({ heavy: true }));
    for (let i = 0; i < 40; i++) stepArena(a, emptyInput());
    expect(a.enemies[0].hp).toBeLessThan(a.enemies[0].maxHp);
  });

  it('chains three light attacks into a finisher and builds a combo', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.passive = true;
    a.enemies[0].hp = a.enemies[0].maxHp = 500;
    a.enemies[0].x = a.player.x + 50;
    for (let i = 0; i < 90; i++) stepArena(a, press({ light: i % 6 === 0 }));
    expect(a.stats.chain3).toBeGreaterThanOrEqual(1);
    expect(a.combo.count).toBeGreaterThanOrEqual(3);
  });

  it('special costs energy, hits every enemy in radius', () => {
    const a = createArena({ waves: [['melee', 'melee']] }, calm);
    a.passive = true;
    a.enemies[0].x = 250; a.enemies[1].x = 320;
    a.energy = 100;
    stepArena(a, press({ special: true }));
    for (let i = 0; i < 30; i++) stepArena(a, emptyInput());
    expect(a.energy).toBe(50);
    expect(a.enemies[0].hp).toBeLessThan(a.enemies[0].maxHp);
    expect(a.enemies[1].hp).toBeLessThan(a.enemies[1].maxHp);
  });

  it('special does nothing without enough energy', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.energy = 49;
    stepArena(a, press({ special: true }));
    expect(a.player.state).not.toBe('special');
    expect(a.energy).toBe(49);
  });

  it('blocking an enemy strike chips little damage and charges energy', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.enemies[0].x = a.player.x + 60;
    a.enemies[0].cooldown = 0;
    for (let i = 0; i < 70; i++) stepArena(a, press({ block: true }));
    expect(a.stats.blocks).toBeGreaterThanOrEqual(1);
    expect(a.player.hp).toBeGreaterThan(95);
    expect(a.energy).toBeGreaterThanOrEqual(4);
  });
});

describe('enemies', () => {
  it('ranged enemy fires projectiles that damage a standing player', () => {
    const a = createArena({ waves: [['ranged']] }, calm);
    a.enemies[0].x = a.player.x + 300;
    let fired = false;
    for (let i = 0; i < 500 && !a.over; i++) {
      stepArena(a, emptyInput());
      if (a.projectiles.length > 0) fired = true;
    }
    expect(fired).toBe(true);
    expect(a.player.hp).toBeLessThan(a.player.maxHp);
  });

  it('assassin dash connects with a standing player', () => {
    const a = createArena({ waves: [['assassin']] }, calm);
    a.enemies[0].x = a.player.x + 400;
    for (let i = 0; i < 240 && !a.over; i++) stepArena(a, emptyInput());
    expect(a.player.hp).toBeLessThan(a.player.maxHp);
  });

  it('a dodge during the telegraph avoids the first assassin dash', () => {
    const a = createArena({ waves: [['assassin']] }, calm);
    a.enemies[0].x = a.player.x + 400;
    let dodged = false;
    for (let i = 0; i < 240 && !a.over; i++) {
      const e = a.enemies[0];
      const doDodge = !dodged && e.state === 'telegraph' && e.t > 0.2;
      if (doDodge) dodged = true;
      stepArena(a, press({ dodge: doDodge }));
      if (e.state === 'recovery') break;
    }
    expect(dodged).toBe(true);
    expect(a.player.hp).toBe(a.player.maxHp);
  });
});

describe('waves', () => {
  it('spawns the next wave after a delay, then reports victory', () => {
    const a = createArena({ waves: [['melee'], ['melee']] }, calm);
    expect(a.wave).toBe(1);
    a.enemies[0].state = 'dead';
    for (let i = 0; i < 70; i++) stepArena(a, emptyInput());
    expect(a.wave).toBe(2);
    expect(a.enemies[0].state).not.toBe('dead');
    expect(a.over).toBeNull();
    a.enemies[0].state = 'dead';
    stepArena(a, emptyInput());
    expect(a.over).toBe('victory');
  });

  it('reports victory when a lone enemy is defeated', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.enemies[0].x = a.player.x + 60;
    a.enemies[0].hp = 1;
    stepArena(a, press({ heavy: true }));
    for (let i = 0; i < 40; i++) stepArena(a, emptyInput());
    expect(a.over).toBe('victory');
  });
});