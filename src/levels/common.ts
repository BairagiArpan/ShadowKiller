import type { Tier } from './types';

export const WORLD_COUNT = 5;
export const LEVELS_PER_WORLD = 100;
export const MINI_BOSS_LEVELS = [85, 90, 95];

export const TIER_BOUNDS: Record<Tier, [number, number]> = {
  easy: [1, 20], normal: [21, 40], medium: [41, 60], hard: [61, 80],
  very_hard: [81, 95], extreme: [96, 99], boss: [100, 100],
};

export function tierOf(level: number): Tier {
  const order: Tier[] = ['easy', 'normal', 'medium', 'hard', 'very_hard', 'extreme', 'boss'];
  for (const t of order) if (level <= TIER_BOUNDS[t][1]) return t;
  return 'boss';
}

export function levelId(world: number, level: number): string {
  return `w${world}-l${String(level).padStart(3, '0')}`;
}

export function parseLevelId(id: string): { world: number; level: number } | null {
  const m = /^w([1-5])-l(\d{3})$/.exec(id);
  if (!m) return null;
  const level = Number(m[2]);
  if (level < 1 || level > LEVELS_PER_WORLD) return null;
  return { world: Number(m[1]), level };
}

export function tierLabel(t: Tier): string {
  return t.replace('_', ' ').toUpperCase();
}