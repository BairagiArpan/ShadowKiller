import { hapticMs, joystickToInput, shouldBuzz, valueFromX } from '../controlsLogic';
import { describe, expect, it } from '@jest/globals';

describe('joystickToInput', () => {
  it('maps directions with a dead zone', () => {
    expect(joystickToInput(0.2, 0, false)).toMatchObject({ left: false, right: false, block: false, jump: false });
    expect(joystickToInput(0.6, 0, false).right).toBe(true);
    expect(joystickToInput(-0.6, 0, false).left).toBe(true);
    expect(joystickToInput(0, 0.8, false).block).toBe(true);
  });
  it('jumps once per upward push, not every frame', () => {
    let held = false;
    let jumps = 0;
    for (let i = 0; i < 10; i++) {
      const r = joystickToInput(0, -0.9, held);
      held = r.jumpHeld;
      if (r.jump) jumps += 1;
    }
    expect(jumps).toBe(1);
  });
  it('re-arms after the stick returns toward the middle', () => {
    let held = joystickToInput(0, -0.9, false).jumpHeld;
    expect(joystickToInput(0, -0.4, held).jumpHeld).toBe(true);   // still in the hysteresis band
    held = joystickToInput(0, -0.1, held).jumpHeld;
    expect(held).toBe(false);
    expect(joystickToInput(0, -0.9, held).jump).toBe(true);
  });
  it('allows moving and jumping together', () => {
    expect(joystickToInput(0.8, -0.8, false)).toMatchObject({ right: true, jump: true });
  });
});

describe('valueFromX', () => {
  it('maps, clamps and rounds to 5% steps', () => {
    expect(valueFromX(0, 200)).toBe(0);
    expect(valueFromX(100, 200)).toBe(0.5);
    expect(valueFromX(50, 200)).toBe(0.25);
    expect(valueFromX(999, 200)).toBe(1);
    expect(valueFromX(-20, 200)).toBe(0);
    expect(valueFromX(103, 200)).toBe(0.5);
  });
  it('is safe with bad input', () => {
    expect(valueFromX(10, 0)).toBe(0);
    expect(valueFromX(NaN, 200)).toBe(0);
  });
});

describe('vibration', () => {
  it('has short buzzes for the important events and none for the rest', () => {
    expect(hapticMs('hurt')).toBeGreaterThan(0);
    expect(hapticMs('boss_phase')).toBeGreaterThan(hapticMs('hurt'));
    expect(hapticMs('hit_light')).toBe(0);
    expect(hapticMs('nope')).toBe(0);
    ['hurt', 'boss_phase', 'special', 'hit_heavy'].forEach((e) => expect(hapticMs(e)).toBeLessThanOrEqual(200));
  });
  it('throttles rapid events but tolerates a clock that moved backwards', () => {
    expect(shouldBuzz(1000, 1050)).toBe(false);
    expect(shouldBuzz(1000, 1080)).toBe(true);
    expect(shouldBuzz(5000, 100)).toBe(true);
  });
});