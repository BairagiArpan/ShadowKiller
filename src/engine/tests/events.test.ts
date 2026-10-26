import { createArena, emptyInput, stepArena } from '../arena';
import { MAX_EVENTS } from '../constants';
import { it, expect, describe } from '@jest/globals';

const calm = () => 0.99;

describe('audio events', () => {
  it('emits dodge, hit and enemy_down events', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    stepArena(a, { ...emptyInput(), dodge: true });
    expect(a.events).toContain('dodge');

    const b = createArena({ waves: [['melee']] }, calm);
    b.enemies[0].x = b.player.x + 60;
    b.enemies[0].hp = 1;
    stepArena(b, { ...emptyInput(), heavy: true });
    for (let i = 0; i < 40; i++) stepArena(b, emptyInput());
    expect(b.events).toContain('hit_heavy');
    expect(b.events).toContain('enemy_down');
    expect(b.events).toContain('victory');
  });

  it('caps the queue so an undrained queue cannot grow without limit', () => {
    const a = createArena({ waves: [['melee']] }, calm);
    a.passive = true;
    a.enemies[0].hp = a.enemies[0].maxHp = 5000;
    a.enemies[0].x = a.player.x + 50;
    for (let i = 0; i < 600; i++) stepArena(a, { ...emptyInput(), light: i % 6 === 0 });
    expect(a.events.length).toBeLessThanOrEqual(MAX_EVENTS);
  });
});