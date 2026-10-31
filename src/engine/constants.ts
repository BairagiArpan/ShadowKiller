import type { AttackKind } from './types';

export const WORLD_W = 800;
export const WORLD_H = 360;
export const GROUND_Y = 300;
export const FIXED_DT = 1 / 60;
export const GRAVITY = 1800;

export const FIGHTER_W = 40;
export const FIGHTER_H = 80;
export const MOVE_SPEED = 220;
export const JUMP_VELOCITY = 700;

export const DODGE_TIME = 0.25; // also the i-frame duration
export const DODGE_SPEED = 420;
export const HURT_TIME = 0.3;
export const HIT_INVULN = 0.25;       // i-frames after the player is hit
export const ENEMY_HIT_INVULN = 0.08; // short, so combo chains are not swallowed
export const BLOCK_REDUCTION = 0.8;
export const HITSTOP = 0.05;
export const ARMOR_BREAK_KNOCKBACK = 300; // armored enemies only stagger at/above this

export const BUFFER_TIME = 0.18; // input buffer window (seconds)
export const COMBO_WINDOW = 2.0;
export const MAX_COMBO_STACKS = 10;
export const COMBO_BONUS_PER_HIT = 0.03;
export const DODGE_COOLDOWN = 0.6; // seconds from the start of one dodge to the earliest next one (0 = no limit)

export const PLAYER_MAX_HP = 100;
export const MAX_ENERGY = 100;
export const SPECIAL_COST = 50;
export const SPECIAL = { windup: 0.15, duration: 0.5, radius: 150, damage: 30, knockback: 420 };
export const ENERGY_ON_BLOCK = 4;
export const ENERGY_GAIN: Record<AttackKind | 'special', number> = {
  light1: 6, light2: 6, light3: 10, heavy: 12, special: 0,
  
};

export const ENEMY_BLOCK_TIME = 0.5;
export const ENEMY_HURT_TIME = 0.35;
export const MAX_ENEMIES = 4;
export const MAX_PROJECTILES = 8;
export const PROJECTILE_W = 18;
export const PROJECTILE_H = 10;
export const PROJECTILE_Y = 40; // height above the shooter's feet
export const WAVE_DELAY = 1.0;

export const MIN_TELEGRAPH = 0.25;        // no first-strike wind-up is ever shorter than this
export const MIN_TELEGRAPH_CHAIN = 0.2;   // follow-up strikes of multi-strike enemies
export const MAX_ENEMY_DAMAGE = 60;       // fairness cap on any single enemy hit
export const MAX_HAZARDS = 2;
export const HAZARD_WARN = 0.9;           // visible warning before a hazard fires
export const HAZARD_ACTIVE = 0.6;
export const HAZARD_H = 14;
export const ICE_GRIP = 2.5;              // how quickly velocity follows input on ice

export const FX_TIME = 0.3; // seconds a hit effect plays

export const ROAR_TIME = 1.2;   // boss phase-change pause (invulnerable)
export const MAX_EVENTS = 16;   // cap on queued audio events per frame batch