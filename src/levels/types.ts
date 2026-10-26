import type { EnemyKind, EnemyScaling, Hazard } from '../engine/types';

export type Tier = 'easy' | 'normal' | 'medium' | 'hard' | 'very_hard' | 'extreme' | 'boss';
export type ObjectiveKind = 'combo' | 'speed' | 'health';

export interface Objective {
  kind: ObjectiveKind;
  target: number; // combo: hits, speed: seconds, health: fraction 0..1
  label: string;
}

export interface LevelConfig {
  id: string;           // e.g. 'w2-l047'
  world: number;        // 1..5
  level: number;        // 1..100
  tier: Tier;
  waves: EnemyKind[][];
  hazards: Hazard[];
  scaling: EnemyScaling;
  healPerWave: number;
  objective: Objective;
  miniBoss: boolean;
  worldBoss: boolean;
  parTime: number;      // seconds; used for the time bonus
  totalHp: number;      // sum of all enemy HP (for validation / tuning)
  baseReward: number;   // coins for a first clear
}