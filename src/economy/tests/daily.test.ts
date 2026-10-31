import { DAILY } from '../economy.config';
import { defaultSave } from '../../persistence/saveData';
import {
  claimDaily, currentStreak, dailyStatus, formatDuration, nextDay, observeClock, resetClockLock,
} from '../daily';
import { describe, expect, it } from '@jest/globals';

const H = 3600_000;
const T0 = 1_700_000_000_000;

describe('config sanity', () => {
  it('has 7 positive whole-number rewards, never decreasing, with day 7 the biggest', () => {
    expect(DAILY.rewards).toHaveLength(7);
    DAILY.rewards.forEach((r) => { expect(Number.isInteger(r)).toBe(true); expect(r).toBeGreaterThan(0); });
    for (let i = 1; i < 7; i++) expect(DAILY.rewards[i]).toBeGreaterThanOrEqual(DAILY.rewards[i - 1]);
    expect(DAILY.rewards[6]).toBe(Math.max(...DAILY.rewards));
    expect(DAILY.rewards.reduce((s, r) => s + r, 0)).toBeLessThanOrEqual(400); // a week is a small bonus, not an economy
  });
  it('lets a daily player keep a streak (break window longer than the cooldown plus slack)', () => {
    expect(DAILY.streakBreakMs).toBeGreaterThan(DAILY.cooldownMs + 12 * H);
  });
});

describe('claiming', () => {
  it('is ready on a fresh save and pays day 1', () => {
    const s = defaultSave();
    expect(dailyStatus(s.daily, T0)).toEqual({ kind: 'ready', day: 1, reward: DAILY.rewards[0] });
    const out = claimDaily(s, T0);
    expect(out.result).toEqual({ ok: true, reward: DAILY.rewards[0], day: 1 });
    expect(out.save.coins).toBe(DAILY.rewards[0]);
    expect(out.save.daily).toEqual({ lastClaimAt: T0, streak: 1, totalClaims: 1, maxSeen: T0 });
    expect(s.coins).toBe(0); // input not mutated
  });

  it('refuses a second claim during the cooldown and hands back the same save', () => {
    const first = claimDaily(defaultSave(), T0).save;
    const again = claimDaily(first, T0 + 1000);
    expect(again.result).toEqual({ ok: false, reason: 'wait' });
    expect(again.save).toBe(first);
    const st = dailyStatus(first.daily, T0 + 1000);
    expect(st.kind === 'wait' && st.msLeft).toBe(DAILY.cooldownMs - 1000);
  });

  it('becomes ready again exactly when the cooldown ends', () => {
    const first = claimDaily(defaultSave(), T0).save;
    expect(dailyStatus(first.daily, T0 + DAILY.cooldownMs - 1).kind).toBe('wait');
    expect(dailyStatus(first.daily, T0 + DAILY.cooldownMs).kind).toBe('ready');
    expect(claimDaily(first, T0 + DAILY.cooldownMs).result).toEqual({ ok: true, reward: DAILY.rewards[1], day: 2 });
  });

  it('pays the whole 7-day cycle in order, then starts over', () => {
    let s = defaultSave();
    let total = 0;
    for (let i = 0; i < 8; i++) {
      const out = claimDaily(s, T0 + i * 24 * H);
      expect(out.result).toEqual({ ok: true, reward: DAILY.rewards[i % 7], day: (i % 7) + 1 });
      total += DAILY.rewards[i % 7];
      s = out.save;
    }
    expect(s.coins).toBe(total);
    expect(s.daily.totalClaims).toBe(8);
  });

  it('restarts the streak after the break window but not just inside it', () => {
    const s = claimDaily(defaultSave(), T0).save;
    expect(nextDay(s.daily, T0 + DAILY.streakBreakMs - 1)).toBe(2);
    expect(currentStreak(s.daily, T0 + DAILY.streakBreakMs - 1)).toBe(1);
    expect(nextDay(s.daily, T0 + DAILY.streakBreakMs)).toBe(1);
    expect(currentStreak(s.daily, T0 + DAILY.streakBreakMs)).toBe(0);
    const late = claimDaily(s, T0 + 50 * H);
    expect(late.result).toEqual({ ok: true, reward: DAILY.rewards[0], day: 1 });
    expect(late.save.daily.streak).toBe(1);
  });
});

describe('clock tampering', () => {
  it('blocks claiming when the clock is moved back, without changing the save', () => {
    const s = claimDaily(defaultSave(), T0).save;
    const out = claimDaily(s, T0 - H);
    expect(out.result).toEqual({ ok: false, reason: 'clock_back' });
    expect(out.save).toBe(s);
    expect(dailyStatus(s.daily, T0 - H).kind).toBe('clock_back');
  });

  it('allows a small backwards step (network time correction)', () => {
    const s = claimDaily(defaultSave(), T0).save;
    expect(dailyStatus(s.daily, T0 - 5 * 60_000).kind).toBe('wait');
  });

  it('a forward jump locks the player out until real time catches up', () => {
    const base = claimDaily(defaultSave(), T0).save;
    const jumped = observeClock(base, T0 + 365 * 24 * H);
    expect(jumped.daily.maxSeen).toBe(T0 + 365 * 24 * H);
    const back = dailyStatus(jumped.daily, T0 + 25 * H);
    expect(back.kind).toBe('clock_back');
    expect(claimDaily(jumped, T0 + 25 * H).result).toEqual({ ok: false, reason: 'clock_back' });
  });

  it('only re-saves the latest time when it advanced noticeably', () => {
    const s = observeClock(defaultSave(), T0);
    expect(s.daily.maxSeen).toBe(T0);
    expect(observeClock(s, T0 + 30_000)).toBe(s);
    expect(observeClock(s, T0 - 1000)).toBe(s);
    expect(observeClock(s, T0 + 2 * DAILY.observeStepMs).daily.maxSeen).toBe(T0 + 2 * DAILY.observeStepMs);
  });

  it('rejects invalid clock values', () => {
    const s = defaultSave();
    expect(dailyStatus(s.daily, NaN).kind).toBe('clock_back');
    expect(claimDaily(s, NaN).result).toEqual({ ok: false, reason: 'clock_back' });
    expect(claimDaily(s, -5).save).toBe(s);
    expect(observeClock(s, NaN)).toBe(s);
  });

  it('reset clears the lock but costs the streak and starts a fresh cooldown', () => {
    let s = claimDaily(defaultSave(), T0).save;
    s = observeClock(s, T0 + 100 * 24 * H);
    const now = T0 + 2 * H;
    expect(dailyStatus(s.daily, now).kind).toBe('clock_back');
    const r = resetClockLock(s, now);
    expect(r.ok).toBe(true);
    expect(r.save.daily.streak).toBe(0);
    expect(r.save.daily.totalClaims).toBe(1);
    expect(dailyStatus(r.save.daily, now).kind).toBe('wait'); // no instant claim: reset is not an exploit
    expect(claimDaily(r.save, now).result).toEqual({ ok: false, reason: 'wait' });
    const later = claimDaily(r.save, now + DAILY.cooldownMs);
    expect(later.result).toEqual({ ok: true, reward: DAILY.rewards[0], day: 1 });
  });

  it('reset does nothing when the clock is not locked', () => {
    const s = claimDaily(defaultSave(), T0).save;
    const r = resetClockLock(s, T0 + H);
    expect(r.ok).toBe(false);
    expect(r.save).toBe(s);
  });
});

describe('formatDuration', () => {
  it('formats readable durations', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(61_000)).toBe('1m 1s');
    expect(formatDuration(3_661_000)).toBe('1h 1m');
    expect(formatDuration(3 * 24 * H)).toBe('3 days');
    expect(formatDuration(-10)).toBe('0s');
  });
});