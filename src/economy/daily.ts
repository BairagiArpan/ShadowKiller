import type { DailyState, SaveData } from '../persistence/saveData';
import { DAILY } from './economy.config';

export type DailyStatus =
  | { kind: 'ready'; day: number; reward: number }
  | { kind: 'wait'; day: number; reward: number; msLeft: number }
  | { kind: 'clock_back'; msLeft: number };

export type DailyClaim =
  | { ok: true; reward: number; day: number }
  | { ok: false; reason: 'wait' | 'clock_back' | 'invalid_reward' };

const validNow = (n: number): boolean => Number.isFinite(n) && n > 0;

function continuing(d: DailyState, now: number): boolean {
  return d.lastClaimAt > 0 && now - d.lastClaimAt < DAILY.streakBreakMs;
}

/** Streak that is still alive right now (a streak older than the break window counts as 0). */
export function currentStreak(d: DailyState, now: number): number {
  return continuing(d, now) ? d.streak : 0;
}

/** Which reward day (1..7) the next claim pays. */
export function nextDay(d: DailyState, now: number): number {
  return continuing(d, now) ? (d.streak % DAILY.rewards.length) + 1 : 1;
}

export function dailyStatus(d: DailyState, now: number): DailyStatus {
  if (!validNow(now)) return { kind: 'clock_back', msLeft: 0 };
  if (now < d.maxSeen - DAILY.clockToleranceMs) return { kind: 'clock_back', msLeft: d.maxSeen - now };
  const day = nextDay(d, now);
  const reward = DAILY.rewards[day - 1];
  if (d.lastClaimAt > 0) {
    const elapsed = now - d.lastClaimAt;
    if (elapsed < DAILY.cooldownMs) return { kind: 'wait', day, reward, msLeft: DAILY.cooldownMs - elapsed };
  }
  return { kind: 'ready', day, reward };
}

/** Pure and atomic. On any refusal the SAME save object comes back, unchanged. */
export function claimDaily(save: SaveData, now: number): { save: SaveData; result: DailyClaim } {
  const fail = (reason: 'wait' | 'clock_back' | 'invalid_reward') => ({ save, result: { ok: false, reason } as DailyClaim });
  const st = dailyStatus(save.daily, now);
  if (st.kind === 'clock_back') return fail('clock_back');
  if (st.kind === 'wait') return fail('wait');
  if (!Number.isInteger(st.reward) || st.reward < 0) return fail('invalid_reward');

  const d = save.daily;
  const t = Math.floor(now);
  return {
    save: {
      ...save,
      coins: save.coins + st.reward,
      daily: {
        lastClaimAt: t,
        streak: continuing(d, now) ? d.streak + 1 : 1,
        totalClaims: d.totalClaims + 1,
        maxSeen: Math.max(d.maxSeen, t),
      },
    },
    result: { ok: true, reward: st.reward, day: st.day },
  };
}

/** Records the latest time seen. Only re-saves when it advanced noticeably, so it does not spam the disk. */
export function observeClock(save: SaveData, now: number): SaveData {
  if (!validNow(now) || now <= save.daily.maxSeen + DAILY.observeStepMs) return save;
  return { ...save, daily: { ...save.daily, maxSeen: Math.floor(now) } };
}

/**
 * Escape hatch for an honestly wrong clock. Only works while the clock is locked. It costs the streak
 * and starts a fresh cooldown, so it cannot be used to claim extra rewards.
 */
export function resetClockLock(save: SaveData, now: number): { save: SaveData; ok: boolean } {
  if (!validNow(now) || dailyStatus(save.daily, now).kind !== 'clock_back') return { save, ok: false };
  const t = Math.floor(now);
  return { save: { ...save, daily: { ...save.daily, lastClaimAt: t, streak: 0, maxSeen: t } }, ok: true };
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 48) return `${Math.floor(h / 24)} days`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}