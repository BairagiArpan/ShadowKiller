import { ENEMY_DEFS } from './enemies';
import type { EnemyDef } from './enemies';
import type { Arena, BossState } from './types';

type Move = Partial<Pick<EnemyDef,
  'style' | 'attackRange' | 'telegraph' | 'active' | 'recovery' | 'damage' | 'reach' |
  'knockback' | 'strikes' | 'dashSpeed' | 'projectileSpeed' | 'cooldown'>>;

/** Boss attack library. Every move is telegraphed; chained strikes use the shorter chained wind-up. */
export const MOVES: Record<string, Move> = {
  slam:   { style: 'strike', attackRange: 100, telegraph: 0.65, active: 0.15, recovery: 0.95, damage: 22, reach: 110, knockback: 380, strikes: 1, cooldown: 0.4 },
  combo:  { style: 'strike', attackRange: 100, telegraph: 0.5,  active: 0.12, recovery: 0.8,  damage: 13, reach: 100, knockback: 240, strikes: 3, cooldown: 0.4 },
  lunge:  { style: 'dash',   attackRange: 220, telegraph: 0.55, active: 0.35, recovery: 1.0,  damage: 20, reach: 70,  knockback: 320, strikes: 1, dashSpeed: 560, cooldown: 0.4 },
  bolt:   { style: 'shot',   attackRange: 460, telegraph: 0.6,  active: 0.1,  recovery: 0.7,  damage: 14, reach: 0,   knockback: 200, strikes: 1, projectileSpeed: 300, cooldown: 0.4 },
  volley: { style: 'shot',   attackRange: 460, telegraph: 0.55, active: 0.1,  recovery: 0.9,  damage: 10, reach: 0,   knockback: 160, strikes: 3, projectileSpeed: 280, cooldown: 0.4 },
};

export interface PhaseDef {
  threshold: number; // phase starts when HP fraction <= this
  speed: number; dmg: number; tel: number; // multipliers on top of the level scaling
  moves: string[];   // played in order, then repeated
  color: string;     // PLACEHOLDER body color (changes per phase as a visual cue)
  summon: number;    // melee minions summoned on entering the phase (only if a slot is free)
}

export interface BossDef {
  name: string; title: string; blurb: string; phases: PhaseDef[];
}

/** Names and designs are original placeholders; final boss art is not done. */
export const BOSSES: Record<number, BossDef> = {
  1: {
    name: 'Temple Warden', title: 'Guardian of the Hollow Shrine',
    blurb: 'Bound to the ruined temple, he strikes anything that crosses the threshold.',
    phases: [
      { threshold: 1,   speed: 1.0, dmg: 1.0, tel: 1.0,  moves: ['slam', 'combo'],                  color: '#ff8c1a', summon: 0 },
      { threshold: 0.6, speed: 1.1, dmg: 1.1, tel: 0.92, moves: ['combo', 'lunge', 'slam'],         color: '#ff5a1f', summon: 1 },
      { threshold: 0.3, speed: 1.2, dmg: 1.2, tel: 0.85, moves: ['combo', 'lunge', 'combo', 'slam'], color: '#ff2d2d', summon: 0 },
    ],
  },
  2: {
    name: 'Blood Stag', title: 'Lord of the Crimson Hunt',
    blurb: 'Fast and relentless. He charges first and asks questions never.',
    phases: [
      { threshold: 1,   speed: 1.05, dmg: 1.0,  tel: 1.0,  moves: ['lunge', 'combo'],                  color: '#d4243d', summon: 0 },
      { threshold: 0.6, speed: 1.15, dmg: 1.1,  tel: 0.92, moves: ['lunge', 'lunge', 'combo', 'bolt'], color: '#ff4a5e', summon: 1 },
      { threshold: 0.3, speed: 1.25, dmg: 1.2,  tel: 0.85, moves: ['lunge', 'bolt', 'combo', 'lunge'], color: '#ff9aa8', summon: 0 },
    ],
  },
  3: {
    name: 'Glacier Sovereign', title: 'Ruler of the Frozen Throne',
    blurb: 'Shards of ice answer his every gesture. Keep moving.',
    phases: [
      { threshold: 1,   speed: 1.0,  dmg: 1.0,  tel: 1.0,  moves: ['bolt', 'slam'],               color: '#4cd6ff', summon: 0 },
      { threshold: 0.6, speed: 1.1,  dmg: 1.1,  tel: 0.92, moves: ['volley', 'slam', 'bolt'],     color: '#8fe3ff', summon: 1 },
      { threshold: 0.3, speed: 1.2,  dmg: 1.2,  tel: 0.85, moves: ['volley', 'lunge', 'slam'],    color: '#e8fbff', summon: 0 },
    ],
  },
  4: {
    name: 'Magma Tyrant', title: 'Warden of the Burning Gate',
    blurb: 'Every blow from his molten fists shakes the fortress.',
    phases: [
      { threshold: 1,   speed: 1.0,  dmg: 1.05, tel: 1.0,  moves: ['slam', 'combo'],                   color: '#ff7a1a', summon: 0 },
      { threshold: 0.6, speed: 1.1,  dmg: 1.15, tel: 0.92, moves: ['slam', 'volley', 'combo'],         color: '#ff4d1a', summon: 1 },
      { threshold: 0.3, speed: 1.2,  dmg: 1.25, tel: 0.85, moves: ['slam', 'lunge', 'volley', 'combo'], color: '#ffd08a', summon: 0 },
    ],
  },
  5: {
    name: 'The Hollow King', title: 'Emperor of Nothing',
    blurb: 'He has no face, no mercy, and no pattern you can trust. Almost.',
    phases: [
      { threshold: 1,   speed: 1.1,  dmg: 1.1,  tel: 0.95, moves: ['combo', 'bolt', 'lunge'],                  color: '#c04bff', summon: 0 },
      { threshold: 0.6, speed: 1.2,  dmg: 1.2,  tel: 0.9,  moves: ['volley', 'lunge', 'combo', 'slam'],         color: '#7ff3ff', summon: 1 },
      { threshold: 0.3, speed: 1.25, dmg: 1.3,  tel: 0.85, moves: ['volley', 'lunge', 'combo', 'slam', 'bolt'], color: '#ffffff', summon: 1 },
    ],
  },
};

/** Base boss definition + the current move + the phase multipliers. */
export function buildBossDef(world: number, phase: number, moveIdx: number): EnemyDef {
  const def = BOSSES[world];
  const base = ENEMY_DEFS.boss;
  const ph = def.phases[phase];
  const move = MOVES[ph.moves[moveIdx % ph.moves.length]];
  return {
    ...base, ...move,
    label: def.name,
    speed: base.speed * ph.speed,
    damage: Math.round((move.damage ?? base.damage) * ph.dmg),
    telegraph: (move.telegraph ?? base.telegraph) * ph.tel,
    color: ph.color,
  };
}

/** Returns null when the world has no boss design. Mini-bosses use only the first 2 phases. */
export function initBoss(world: number, mini: boolean): BossState | null {
  const def = BOSSES[world];
  if (!def) return null;
  return {
    world, mini, phase: 0, phaseCount: mini ? Math.min(2, def.phases.length) : def.phases.length,
    moveIdx: 0, roar: 0, def: buildBossDef(world, 0, 0),
  };
}

export function advanceMove(b: BossState): void {
  b.moveIdx += 1;
  b.def = buildBossDef(b.world, b.phase, b.moveIdx);
}

/** Highest phase whose HP threshold has been reached (never below the current index of 0). */
export function phaseFor(b: BossState, hpFraction: number): number {
  const phases = BOSSES[b.world].phases;
  let target = 0;
  for (let p = 0; p < b.phaseCount; p++) if (hpFraction <= phases[p].threshold) target = p;
  return target;
}

export function bossLabel(a: Arena): string {
  for (const e of a.enemies) {
    if (!e.boss || e.state === 'dead') continue;
    const name = BOSSES[e.boss.world].name.toUpperCase();
    return `${e.boss.mini ? `CHAMPION OF ${name}` : name}  PHASE ${e.boss.phase + 1}/${e.boss.phaseCount}`;
  }
  return '';
}