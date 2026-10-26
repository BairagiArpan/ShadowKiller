import {
  ARMOR_BREAK_KNOCKBACK, BLOCK_REDUCTION, COMBO_BONUS_PER_HIT, FIGHTER_H, FIGHTER_W,
  GROUND_Y, HIT_INVULN, MAX_COMBO_STACKS,
} from './constants';
import { AttackKind, Fighter, FighterState, HitResult, Rect } from './types';

export interface AttackDef {
  windup: number; active: number; recovery: number;
  damage: number; reach: number; knockback: number;
}

export const PLAYER_ATTACKS: Record<AttackKind, AttackDef> = {
  light1: { windup: 0.05, active: 0.09, recovery: 0.14, damage: 7,  reach: 70, knockback: 90 },
  light2: { windup: 0.05, active: 0.09, recovery: 0.14, damage: 8,  reach: 72, knockback: 110 },
  light3: { windup: 0.08, active: 0.11, recovery: 0.26, damage: 14, reach: 85, knockback: 300 },
  heavy:  { windup: 0.20, active: 0.12, recovery: 0.30, damage: 20, reach: 90, knockback: 320 },
};

/** light1 -> light2 -> light3 -> (restart). */
export function nextLight(cur: AttackKind | null): AttackKind {
  if (cur === 'light1') return 'light2';
  if (cur === 'light2') return 'light3';
  return 'light1';
}

export function comboMultiplier(count: number): number {
  return 1 + COMBO_BONUS_PER_HIT * Math.min(count, MAX_COMBO_STACKS);
}

export function attackDuration(d: AttackDef): number {
  return d.windup + d.active + d.recovery;
}

export function createFighter(
  x: number, facing: 1 | -1, maxHp: number, state: FighterState = 'idle',
): Fighter {
  return {
    x, y: GROUND_Y, vx: 0, vy: 0, facing, hp: maxHp, maxHp, state,
    t: 0, invuln: 0, attackKind: null, hitLanded: false,
  };
}

export function hurtbox(f: Fighter): Rect {
  return { x: f.x - FIGHTER_W / 2, y: f.y - FIGHTER_H, w: FIGHTER_W, h: FIGHTER_H };
}

/** Attack hitbox, only while the swing is in its active window. */
export function attackHitbox(f: Fighter, def: AttackDef): Rect | null {
  if (f.state !== 'attack') return null;
  if (f.t < def.windup || f.t >= def.windup + def.active) return null;
  const y = f.y - FIGHTER_H * 0.8;
  const h = FIGHTER_H * 0.6;
  const x = f.facing === 1 ? f.x + FIGHTER_W / 2 : f.x - FIGHTER_W / 2 - def.reach;
  return { x, y, w: def.reach, h };
}

/** Edges that merely touch do not count as overlap. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export interface HitOptions {
  armored?: boolean;     // light hits do damage but do not stagger
  unblockable?: boolean; // ignores block (special ability)
  invuln?: number;       // i-frames granted to the target
}

/** Applies damage, knockback, block, armor and i-frame rules. Mutates `target`. */
export function applyHit(
  target: Fighter, attackerX: number, damage: number, knockback: number,
  opts: HitOptions = {},
): HitResult {
  if (target.invuln > 0 || target.state === 'dead') return 'ignored';
  const dir = target.x >= attackerX ? 1 : -1; // push away from attacker
  const facingAttacker = target.facing === -dir;

  if (target.state === 'block' && facingAttacker && !opts.unblockable) {
    target.hp = Math.max(0, target.hp - damage * (1 - BLOCK_REDUCTION));
    target.vx = dir * knockback * 0.3;
    target.invuln = 0.15;
    return 'blocked';
  }

  target.hp = Math.max(0, target.hp - damage);
  target.invuln = opts.invuln ?? HIT_INVULN;

  if (target.hp <= 0) {
    target.vx = dir * knockback; target.attackKind = null; target.t = 0; target.state = 'dead';
    return 'hit';
  }
  if (opts.armored && knockback < ARMOR_BREAK_KNOCKBACK) return 'hit'; // shrugs it off
  target.vx = dir * knockback; target.attackKind = null; target.t = 0; target.state = 'hurt';
  return 'hit';
}