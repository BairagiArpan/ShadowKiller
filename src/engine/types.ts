import type { EnemyDef } from './enemies';
import type { ParticleSystem } from './particles';

export type GameEvent =
  | 'hit_light' | 'hit_heavy' | 'blocked' | 'dodge' | 'special' | 'hurt'
  | 'enemy_down' | 'boss_phase' | 'victory' | 'defeat';

export interface BossState {
  world: number; mini: boolean;
  phase: number; phaseCount: number;
  moveIdx: number;
  roar: number;     // seconds of phase-change pause remaining
  def: EnemyDef;    // the current move merged into the base boss definition
}

export type FighterState =
  | 'idle' | 'walk' | 'attack' | 'dodge' | 'block' | 'hurt' | 'dead' | 'special'
  | 'patrol' | 'approach' | 'telegraph' | 'recovery';

export type AttackKind = 'light1' | 'light2' | 'light3' | 'heavy';
export type EnemyKind = 'melee' | 'ranged' | 'assassin' | 'tank' | 'elite' | 'boss';
export type HitResult = 'hit' | 'blocked' | 'ignored';
export type HazardKind = 'spikes' | 'lava' | 'ice' | 'rift';

export interface Rect { x: number; y: number; w: number; h: number }

export interface Fighter {
  x: number;  // center x
  y: number;  // feet y
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  state: FighterState;
  t: number;        // seconds in current state
  invuln: number;
  attackKind: AttackKind | null;
  hitLanded: boolean;
}

/** Per-level enemy tuning (1 = the base values in enemies.ts). */
export interface EnemyScaling {
  hp: number; dmg: number; speed: number; telegraph: number;
  boss: number; // extra HP multiplier for 'boss' kind only (mini-boss < 1)
}

export interface Enemy extends Fighter {
  kind: EnemyKind;
  cooldown: number;
  teleTime: number;
  strikesLeft: number;
  guardRolled: boolean;
  phase: number;  
  hitBySwing: number;
  dmgMul: number;
  spdMul: number;
  telMul: number;
  boss: BossState | null;
}

export interface Hazard {
  kind: HazardKind;
  x: number;       // left edge
  w: number;
  period: number;  // seconds per cycle
  offset: number;  // desync between hazards
  damage: number;
}

export interface Projectile {
  x: number; y: number; vx: number; damage: number; knockback: number; alive: boolean;
}

export interface Input {
  left: boolean; right: boolean; block: boolean;
  jump: boolean; light: boolean; heavy: boolean; dodge: boolean; special: boolean;
}

export interface Stats {
  distance: number; jumps: number; hits: number; heavyHits: number; chain3: number;
  blocks: number; dodges: number; specials: number; kills: number; maxCombo: number;
}

export interface TutorialState { index: number; base: Stats; done: boolean }

export interface Arena {
  player: Fighter;
  enemies: Enemy[];
  projectiles: Projectile[];
  hazards: Hazard[];
  scaling: EnemyScaling;
  healPerWave: number;        // fraction of max HP restored when a wave is cleared
  waves: EnemyKind[][];
  wave: number;
  waveClearedAt: number | null;
  energy: number;
  combo: { count: number; timer: number };
  buffer: { light: number; heavy: number; dodge: number; special: number };
  swing: number;
  stats: Stats;
  passive: boolean;
  tutorial: TutorialState | null;
  time: number;
  shake: number;
  hitstop: number;
  over: null | 'victory' | 'defeat';
  fx: { x: number; y: number; age: number; on: boolean }; // visual-only hit effect
  world: number;              // 0 = no boss scripting
  miniBoss: boolean;
  particles: ParticleSystem;  // visual only
  events: GameEvent[];        // audio events; the screen drains this every frame
  rng: () => number;
}