import { GROUND_Y, HAZARD_ACTIVE, HAZARD_H, HAZARD_WARN } from './constants';
import type { Hazard, HazardKind, Rect } from './types';

export const HAZARD_BASE: Record<HazardKind, { damage: number; color: string; period: number }> = {
  spikes: { damage: 6,  color: '#c9d1d9', period: 3.2 },
  lava:   { damage: 10, color: '#ff5a1f', period: 3.6 },
  ice:    { damage: 0,  color: '#8fe3ff', period: 1 },   // never damages, only slippery
  rift:   { damage: 8,  color: '#b04bff', period: 3.0 },
};

export type HazardPhase = 0 | 1 | 2; // 0 dormant, 1 warning, 2 active

export function hazardPhase(h: Hazard, time: number): HazardPhase {
  if (h.kind === 'ice') return 2;
  const t = (time + h.offset) % h.period;
  if (t >= h.period - HAZARD_ACTIVE) return 2;
  if (t >= h.period - HAZARD_ACTIVE - HAZARD_WARN) return 1;
  return 0;
}

/** A thin strip at ground level: a fighter must be within HAZARD_H px of the floor to touch it. */
export function hazardBox(h: Hazard): Rect {
  return { x: h.x, y: GROUND_Y - HAZARD_H, w: h.w, h: HAZARD_H };
}

export function isOnIce(hazards: Hazard[], x: number): boolean {
  return hazards.some((h) => h.kind === 'ice' && x >= h.x && x <= h.x + h.w);
}