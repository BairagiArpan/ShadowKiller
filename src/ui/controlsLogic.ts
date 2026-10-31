export interface StickInput { left: boolean; right: boolean; block: boolean; jump: boolean; jumpHeld: boolean }

/**
 * Turns a stick position (dx, dy each -1..1, y down) into game input.
 * Jump fires once per upward push: it re-arms only after the stick comes back toward the middle.
 */
export function joystickToInput(dx: number, dy: number, jumpHeld: boolean): StickInput {
  const up = dy < -0.55;
  return {
    left: dx < -0.35,
    right: dx > 0.35,
    block: dy > 0.55,
    jump: up && !jumpHeld,
    jumpHeld: up ? true : dy > -0.3 ? false : jumpHeld,
  };
}

/** Slider position to a value from 0 to 1 in steps of 0.05. */
export function valueFromX(x: number, width: number): number {
  if (!(width > 0) || !Number.isFinite(x)) return 0;
  return Math.round(Math.min(1, Math.max(0, x / width)) * 20) / 20;
}

const HAPTIC_MS: Record<string, number> = { hurt: 45, boss_phase: 160, special: 35, hit_heavy: 20 };

/** Vibration length for a game event (0 = none). */
export function hapticMs(ev: string): number {
  return HAPTIC_MS[ev] ?? 0;
}

/** Throttle: at most one buzz per `gap` ms. A clock that moved backwards never blocks it. */
export function shouldBuzz(last: number, now: number, gap = 80): boolean {
  return now < last || now - last >= gap;
}