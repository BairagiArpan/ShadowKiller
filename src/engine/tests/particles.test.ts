import { createArena, emptyInput, stepArena } from '../arena';
import { GROUND_Y, WORLD_W } from '../constants';
import {
  AmbientStyle, createParticles, emitImpact, liveCount, pointsOf, setParticleLimits, stepParticles,
} from '../particles';
import { it, expect, describe } from '@jest/globals';

const STYLES: AmbientStyle[] = ['motes', 'ash', 'snow', 'embers', 'void'];

describe('ambient particles', () => {
  it.each(STYLES)('%s particles stay inside the arena forever', (style) => {
    const ps = createParticles(style, 40, 0, 0);
    for (let i = 0; i < 2000; i++) stepParticles(ps, 1 / 60, i / 60);
    for (const p of pointsOf(ps.ambient)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(WORLD_W);
      expect(p.y).toBeGreaterThanOrEqual(-9);
      expect(p.y).toBeLessThanOrEqual(GROUND_Y + 1);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = createParticles('snow', 30, 10, 5, 99);
    const b = createParticles('snow', 30, 10, 5, 99);
    for (let i = 0; i < 100; i++) { stepParticles(a, 1 / 60, i / 60); stepParticles(b, 1 / 60, i / 60); }
    expect(Array.from(a.ambient.x)).toEqual(Array.from(b.ambient.x));
  });

  it('limits can be lowered at runtime but never past the pool size', () => {
    const ps = createParticles('motes', 10, 0, 0);
    setParticleLimits(ps, 99, 4);
    expect(ps.ambientActive).toBe(10);
    setParticleLimits(ps, 3, 4);
    expect(pointsOf(ps.ambient, ps.ambientActive)).toHaveLength(3);
    expect(ps.perHit).toBe(4);
  });
});

describe('impact particles', () => {
  it('never exceeds the pool and all of them fade out', () => {
    const ps = createParticles('motes', 0, 20, 8);
    emitImpact(ps, 100, 100, 100);
    expect(liveCount(ps.impact)).toBeLessThanOrEqual(20);
    expect(liveCount(ps.impact)).toBeGreaterThan(0);
    for (let i = 0; i < 70; i++) stepParticles(ps, 1 / 60, i / 60);
    expect(liveCount(ps.impact)).toBe(0);
  });

  it('does nothing (and does not throw) with a zero-size pool', () => {
    const ps = createParticles('motes', 0, 0, 0);
    expect(() => emitImpact(ps, 0, 0, 10)).not.toThrow();
    expect(liveCount(ps.impact)).toBe(0);
  });
});

describe('particles in the arena', () => {
  const particles = { style: 'embers' as const, ambient: 10, impactCap: 40, perHit: 8 };

  it('hits spawn impact particles', () => {
    const a = createArena({ waves: [['melee']], particles }, () => 0.99);
    a.passive = true;
    a.enemies[0].x = a.player.x + 60;
    for (let i = 0; i < 80 && a.stats.hits < 1; i++) stepArena(a, { ...emptyInput(), heavy: i === 0 });
    expect(a.stats.hits).toBeGreaterThanOrEqual(1);
    expect(liveCount(a.particles.impact)).toBeGreaterThan(0);
  });

  it('never touches the combat random generator', () => {
    let calls = 0;
    const a = createArena({ waves: [['melee']], particles }, () => { calls += 1; return 0.99; });
    a.passive = true;
    a.enemies[0].x = a.player.x + 60;
    const before = calls;
    for (let i = 0; i < 60; i++) stepArena(a, { ...emptyInput(), heavy: i === 0 });
    expect(calls).toBe(before); // passive enemies roll no block, so particles must not have called rng
  });
});