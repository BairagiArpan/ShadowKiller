import { PRESETS, QUALITY_ORDER, WORLD_AMBIENT, ambientStyleFor, lowerQuality } from '../graphics';
import { PerfGovernor } from '../perf';
import { it, expect, describe } from '@jest/globals';

describe('graphics presets', () => {
  it('only increase from low to ultra', () => {
    for (let i = 1; i < QUALITY_ORDER.length; i++) {
      const lo = PRESETS[QUALITY_ORDER[i - 1]];
      const hi = PRESETS[QUALITY_ORDER[i]];
      expect(hi.ambient).toBeGreaterThanOrEqual(lo.ambient);
      expect(hi.impactCap).toBeGreaterThanOrEqual(lo.impactCap);
      expect(hi.impactPerHit).toBeGreaterThanOrEqual(lo.impactPerHit);
      expect(hi.parallax).toBeGreaterThanOrEqual(lo.parallax);
    }
  });
  it('keeps every pool big enough for one burst', () => {
    QUALITY_ORDER.forEach((q) => expect(PRESETS[q].impactCap).toBeGreaterThanOrEqual(PRESETS[q].impactPerHit * 2));
  });
  it('gives each world its own ambient style', () => {
    expect(new Set(WORLD_AMBIENT).size).toBe(5);
    expect(ambientStyleFor(3)).toBe('snow');
    expect(ambientStyleFor(99)).toBe('motes');
  });
  it('lowers one step at a time and stops at low', () => {
    expect(lowerQuality('ultra')).toBe('high');
    expect(lowerQuality('medium')).toBe('low');
    expect(lowerQuality('low')).toBe('low');
  });
});

describe('PerfGovernor', () => {
  const feed = (g: PerfGovernor, ms: number, frames: number) => {
    let drops = 0;
    for (let i = 0; i < frames; i++) if (g.sample(ms)) drops += 1;
    return drops;
  };

  it('never downgrades while the frame rate is healthy', () => {
    expect(feed(new PerfGovernor(1000 / 60), 16.7, 3000)).toBe(0);
  });
  it('downgrades when frames stay slow, then waits one window before judging again', () => {
    const g = new PerfGovernor(1000 / 60);
    expect(feed(g, 40, 50)).toBe(1);   // first 2s window
    expect(feed(g, 40, 50)).toBe(0);   // cooldown window
    expect(feed(g, 40, 50)).toBe(1);   // still slow, so another step
  });
  it('ignores hitches such as app switches and pauses', () => {
    expect(feed(new PerfGovernor(1000 / 60), 500, 100)).toBe(0);
    expect(feed(new PerfGovernor(1000 / 60), 0, 100)).toBe(0);
  });
  it('is more tolerant when the target is 30 FPS', () => {
    expect(feed(new PerfGovernor(1000 / 30), 30, 200)).toBe(0);
  });
});