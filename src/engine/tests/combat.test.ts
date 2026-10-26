import { applyHit, comboMultiplier, createFighter, nextLight, rectsOverlap } from '../combat';
import { describe, expect, it } from "@jest/globals";

describe('rectsOverlap', () => {
  it('treats touching edges as not overlapping', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
  it('detects a 1px overlap', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 0, w: 10, h: 10 })).toBe(true);
  });
});

describe('applyHit', () => {
  it('damages, staggers and grants i-frames; second hit is ignored', () => {
    const f = createFighter(300, -1, 100);
    expect(applyHit(f, 200, 20, 100)).toBe('hit');
    expect(f.hp).toBe(80);
    expect(f.state).toBe('hurt');
    expect(applyHit(f, 200, 20, 100)).toBe('ignored');
    expect(f.hp).toBe(80);
  });
  it('reduces damage when blocking toward the attacker', () => {
    const f = createFighter(300, -1, 100);
    f.state = 'block';
    expect(applyHit(f, 200, 20, 100)).toBe('blocked');
    expect(f.hp).toBeCloseTo(96);
  });
  it('does not block attacks from behind', () => {
    const f = createFighter(300, 1, 100);
    f.state = 'block';
    expect(applyHit(f, 200, 20, 100)).toBe('hit');
    expect(f.hp).toBe(80);
  });
  it('unblockable hits go through a block', () => {
    const f = createFighter(300, -1, 100);
    f.state = 'block';
    expect(applyHit(f, 200, 20, 100, { unblockable: true })).toBe('hit');
    expect(f.hp).toBe(80);
  });
  it('armor ignores stagger from light hits but not heavy ones', () => {
    const f = createFighter(300, -1, 100, 'approach');
    expect(applyHit(f, 200, 8, 120, { armored: true, invuln: 0 })).toBe('hit');
    expect(f.hp).toBe(92);
    expect(f.state).toBe('approach');
    expect(applyHit(f, 200, 20, 320, { armored: true, invuln: 0 })).toBe('hit');
    expect(f.state).toBe('hurt');
  });
  it('never drops hp below zero and marks defeat', () => {
    const f = createFighter(300, -1, 10);
    applyHit(f, 200, 50, 0);
    expect(f.hp).toBe(0);
    expect(f.state).toBe('dead');
  });
});

describe('combo helpers', () => {
  it('chains light1 -> light2 -> light3 -> light1', () => {
    expect(nextLight(null)).toBe('light1');
    expect(nextLight('light1')).toBe('light2');
    expect(nextLight('light2')).toBe('light3');
    expect(nextLight('light3')).toBe('light1');
  });
  it('multiplier grows and is capped', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(10)).toBeCloseTo(1.3);
    expect(comboMultiplier(99)).toBeCloseTo(1.3);
  });
});