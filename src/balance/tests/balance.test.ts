import { getLevel } from '../../levels';
import { BotStyle } from '../bot';
import { buildReport, runLevel } from '../sim';
import { describe, expect, it } from '@jest/globals';

const env = ((globalThis as unknown as { process?: { env: Record<string, string | undefined>; cwd: () => string } }).process);
const RUN_REPORT = env?.env.BALANCE === '1';
const RUNS = Math.max(1, Number(env?.env.BALANCE_RUNS ?? '6') || 6);

describe('balance bot', () => {
  it('an expert bot clears World 1 level 1 most of the time', () => {
    let wins = 0;
    for (let s = 1; s <= 8; s++) if (runLevel(getLevel(1, 1), 'expert', undefined, s).won) wins += 1;
    expect(wins).toBeGreaterThanOrEqual(6);
  }, 60000);

  it('a sharper bot does not do clearly worse than a sloppy one, summed over mid-difficulty levels', () => {
    const total = (style: BotStyle) => {
      let wins = 0;
      for (const [w, lv] of [[1, 50], [1, 60], [2, 20]]) {
        for (let s = 1; s <= 6; s++) if (runLevel(getLevel(w, lv), style, undefined, s).won) wins += 1;
      }
      return wins;
    };
    expect(total('expert')).toBeGreaterThanOrEqual(total('novice') - 1);
  }, 180000);

  it('every world runs start to finish without crashing, and always ends', () => {
    for (let w = 1; w <= 5; w++) {
      for (const lv of [1, 50, 100]) {
        const r = runLevel(getLevel(w, lv), 'average', undefined, 7);
        expect(Number.isFinite(r.time)).toBe(true);
        expect(r.hpFraction).toBeGreaterThanOrEqual(0);
        expect(r.hpFraction).toBeLessThanOrEqual(1);
        expect(r.time).toBeLessThanOrEqual(240.1);
      }
    }
  }, 180000);

  it('is deterministic for a given seed', () => {
    const a = runLevel(getLevel(3, 30), 'average', undefined, 42);
    const b = runLevel(getLevel(3, 30), 'average', undefined, 42);
    expect(a).toEqual(b);
  }, 60000);
});

(RUN_REPORT ? describe : describe.skip)('balance report', () => {
  it('writes balance-report.md in the project folder', () => {
    const fs = require('fs');
    const path = require('path');
    const text = buildReport(RUNS);
    fs.writeFileSync(path.join(env!.cwd(), 'balance-report.md'), text);
    console.log(text);
    expect(text).toContain('## Flags');
  }, 20 * 60 * 1000);
});