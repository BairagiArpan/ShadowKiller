import type { AttackDef } from './combat';
import type { Fighter } from './types';

/** lean/weapon in radians (positive = clockwise = forward/down); squash = vertical scale. */
export interface Pose { lean: number; weapon: number; squash: number }

const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, Math.max(0, k));

/** Animation state machine output: a pose derived from state + time-in-state. */
export function poseFor(f: Fighter, def: AttackDef | null): Pose {
  switch (f.state) {
    case 'attack': {
      if (!def) return { lean: 0, weapon: 0.5, squash: 1 };
      if (f.t < def.windup) {
        const k = f.t / def.windup;
        return { lean: lerp(0, -0.15, k), weapon: lerp(0.5, -1.6, k), squash: 1 };
      }
      if (f.t < def.windup + def.active) {
        const k = (f.t - def.windup) / def.active;
        return { lean: lerp(-0.15, 0.25, k), weapon: lerp(-1.6, 1.2, k), squash: 1 };
      }
      const k = (f.t - def.windup - def.active) / def.recovery;
      return { lean: lerp(0.25, 0, k), weapon: lerp(1.2, 0.5, k), squash: 1 };
    }
    case 'telegraph': return { lean: -0.12, weapon: -1.9, squash: 1 };
    case 'block':     return { lean: -0.05, weapon: -0.4, squash: 1 };
    case 'hurt':      return { lean: -0.35, weapon: 1.0, squash: 1 };
    case 'dead':      return { lean: lerp(0, -1.45, f.t / 0.3), weapon: 1.2, squash: 1 };
    case 'dodge':     return { lean: 0.5, weapon: 0.8, squash: 0.82 };
    case 'special':   return { lean: 0, weapon: f.t * 20, squash: 1 };
    case 'recovery':  return { lean: 0.1, weapon: 0.5, squash: 1 };
    case 'walk':
    case 'approach':  return { lean: 0.06, weapon: 0.6, squash: 1 };
    default:          return { lean: 0, weapon: 0.5, squash: 1 };
  }
}