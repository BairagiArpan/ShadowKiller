import { MAX_ENEMY_DAMAGE, MIN_TELEGRAPH, MIN_TELEGRAPH_CHAIN } from './constants';
import { createFighter } from './combat';
import type { AttackDef } from './combat';
import type { Enemy, EnemyKind, EnemyScaling } from './types';

export type AttackStyle = 'strike' | 'shot' | 'dash';

export interface EnemyDef {
  kind: EnemyKind; label: string;
  maxHp: number; speed: number; aggroRange: number;
  attackRange: number;
  style: AttackStyle;
  telegraph: number;
  active: number;
  recovery: number;
  cooldown: number;
  damage: number; reach: number; knockback: number;
  blockChance: number;
  armored: boolean;
  strikes: number;
  keepAway: number;
  projectileSpeed: number;
  dashSpeed: number;
  color: string; // PLACEHOLDER body color
}

export const NO_SCALING: EnemyScaling = { hp: 1, dmg: 1, speed: 1, telegraph: 1, boss: 1 };

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  melee: {
    kind: 'melee', label: 'Shade Fighter', maxHp: 60, speed: 110, aggroRange: 420, attackRange: 80,
    style: 'strike', telegraph: 0.45, active: 0.12, recovery: 0.7, cooldown: 0.4,
    damage: 10, reach: 75, knockback: 220, blockChance: 0.25, armored: false, strikes: 1,
    keepAway: 0, projectileSpeed: 0, dashSpeed: 0, color: '#b3263e',
  },
  ranged: {
    kind: 'ranged', label: 'Wraith Archer', maxHp: 40, speed: 90, aggroRange: 600, attackRange: 380,
    style: 'shot', telegraph: 0.55, active: 0.1, recovery: 0.6, cooldown: 1.2,
    damage: 8, reach: 0, knockback: 150, blockChance: 0.1, armored: false, strikes: 1,
    keepAway: 200, projectileSpeed: 330, dashSpeed: 0, color: '#2a9d8f',
  },
  assassin: {
    kind: 'assassin', label: 'Night Blade', maxHp: 35, speed: 170, aggroRange: 520, attackRange: 200,
    style: 'dash', telegraph: 0.35, active: 0.3, recovery: 0.8, cooldown: 0.8,
    damage: 12, reach: 55, knockback: 260, blockChance: 0, armored: false, strikes: 1,
    keepAway: 0, projectileSpeed: 0, dashSpeed: 620, color: '#e9c46a',
  },
  tank: {
    kind: 'tank', label: 'Iron Colossus', maxHp: 160, speed: 60, aggroRange: 380, attackRange: 85,
    style: 'strike', telegraph: 0.7, active: 0.15, recovery: 1.0, cooldown: 0.6,
    damage: 22, reach: 85, knockback: 380, blockChance: 0.5, armored: true, strikes: 1,
    keepAway: 0, projectileSpeed: 0, dashSpeed: 0, color: '#4a5568',
  },
  elite: {
    kind: 'elite', label: 'Elite Warrior', maxHp: 110, speed: 130, aggroRange: 480, attackRange: 85,
    style: 'strike', telegraph: 0.35, active: 0.12, recovery: 0.6, cooldown: 0.3,
    damage: 14, reach: 85, knockback: 260, blockChance: 0.4, armored: false, strikes: 2,
    keepAway: 0, projectileSpeed: 0, dashSpeed: 0, color: '#7b2d8b',
  },
  // STAND-IN: tougher armored striker. Real multi-phase bosses are Phase 7.
  boss: {
    kind: 'boss', label: 'Boss', maxHp: 400, speed: 100, aggroRange: 700, attackRange: 100, // Base boss values. Per-world phases and moves live in bosses.ts.
    style: 'strike', telegraph: 0.5, active: 0.15, recovery: 0.8, cooldown: 0.5,
    damage: 25, reach: 110, knockback: 400, blockChance: 0.2, armored: true, strikes: 2,
    keepAway: 0, projectileSpeed: 0, dashSpeed: 0, color: '#ff8c1a',
  },
};

export function enemyAttackDef(d: EnemyDef): AttackDef {
  return { windup: 0, active: d.active, recovery: d.recovery, damage: d.damage, reach: d.reach, knockback: d.knockback };
}

export function createEnemy(
  kind: EnemyKind, x: number, phase = 0, hpOverride?: number, scaling: EnemyScaling = NO_SCALING,
): Enemy {
  const d = ENEMY_DEFS[kind];
  const hp = hpOverride ?? Math.round(d.maxHp * scaling.hp * (kind === 'boss' ? scaling.boss : 1));
  const f = createFighter(x, -1, hp, 'patrol');
  return {
    ...f, kind, cooldown: 0.5,
    teleTime: Math.max(MIN_TELEGRAPH, d.telegraph * scaling.telegraph),
    strikesLeft: 0, guardRolled: false, phase, hitBySwing: -1,
    dmgMul: scaling.dmg, spdMul: scaling.speed, telMul: scaling.telegraph, boss: null,
  };
}

/** Wind-up length for the next strike. Never shorter than the fairness floor. */
export function telegraphFor(e: Enemy, d: EnemyDef, chained: boolean): number {
  const base = Math.max(MIN_TELEGRAPH, d.telegraph * e.telMul);
  return chained ? Math.max(MIN_TELEGRAPH_CHAIN, base * 0.6) : base;
}

export function enemyDamage(e: Enemy, d: EnemyDef): number {
  return Math.min(MAX_ENEMY_DAMAGE, d.damage * e.dmgMul);
}

/** The definition an enemy is using right now (bosses swap this per move and phase). */
export function defOf(e: Enemy): EnemyDef {
  return e.boss ? e.boss.def : ENEMY_DEFS[e.kind];
}