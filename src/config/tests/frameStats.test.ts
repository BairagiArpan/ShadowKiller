import { FrameStats } from '../frameStats';
import {it, expect, describe} from '@jest/globals';

describe('FrameStats', () => {
  it('reports zeros with no samples', () => {
    expect(new FrameStats().summary()).toEqual({ fps: 0, avgMs: 0, p95Ms: 0, worstMs: 0, samples: 0 });
  });
  it('computes fps, average and worst frame', () => {
    const s = new FrameStats();
    for (let i = 0; i < 100; i++) s.add(16.667);
    const r = s.summary();
    expect(r.fps).toBeCloseTo(60, 0);
    expect(r.avgMs).toBeCloseTo(16.667, 2);
    expect(r.worstMs).toBeCloseTo(16.667, 2);
    expect(r.samples).toBe(100);
  });
  it('p95 shows a stutter that the average hides', () => {
    const s = new FrameStats();
    for (let i = 0; i < 90; i++) s.add(16);
    for (let i = 0; i < 10; i++) s.add(60);
    const r = s.summary();
    expect(r.avgMs).toBeLessThan(25);
    expect(r.p95Ms).toBe(60);
    expect(r.worstMs).toBe(60);
  });
  it('keeps only the most recent frames', () => {
    const s = new FrameStats(10);
    for (let i = 0; i < 10; i++) s.add(100);
    for (let i = 0; i < 10; i++) s.add(10);
    expect(s.summary().avgMs).toBe(10);
    expect(s.summary().samples).toBe(10);
  });
  it('ignores invalid values and hitches over 250 ms, and can reset', () => {
    const s = new FrameStats();
    s.add(0); s.add(-5); s.add(NaN); s.add(900);
    expect(s.summary().samples).toBe(0);
    s.add(16);
    s.reset();
    expect(s.summary().samples).toBe(0);
  });
});