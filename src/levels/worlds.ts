import type { EnemyKind, HazardKind } from '../engine/types';

export interface WorldDef {
  index: number; // 1..5
  id: string;
  name: string;
  blurb: string;
  palette: { sky: string; ground: string; accent: string; moon: string };
  music: string; // key for Phase 7 audio (not used yet)
  roster: { kind: Exclude<EnemyKind, 'boss'>; from: number; weight: number }[];
  hazards: { kind: HazardKind; from: number }[];
  bossName: string;                 // PLACEHOLDER name; boss design is Phase 7
  bossGuards: Exclude<EnemyKind, 'boss'>[];
  challenge: { hp: number; dmg: number };
}

export const WORLDS: WorldDef[] = [
  {
    index: 1, id: 'shadow_village', name: 'Shadow Village',
    blurb: 'Abandoned temples and moonlit rooftops.',
    palette: { sky: '#0c0a1c', ground: '#15122a', accent: '#7a2cff', moon: '#cfd6ff' },
    music: 'village',
    roster: [
      { kind: 'melee', from: 1, weight: 5 }, { kind: 'ranged', from: 21, weight: 2 },
      { kind: 'assassin', from: 31, weight: 2 }, { kind: 'tank', from: 41, weight: 2 },
      { kind: 'elite', from: 61, weight: 2 },
    ],
    hazards: [{ kind: 'spikes', from: 41 }],
    bossName: 'Temple Warden', bossGuards: ['melee', 'melee'],
    challenge: { hp: 1.3, dmg: 1.2 },
  },
  {
    index: 2, id: 'crimson_forest', name: 'Crimson Forest',
    blurb: 'Cursed trees, fog and hidden traps.',
    palette: { sky: '#1a0709', ground: '#2a0f12', accent: '#d4243d', moon: '#ffb0a0' },
    music: 'forest',
    roster: [
      { kind: 'melee', from: 1, weight: 3 }, { kind: 'assassin', from: 1, weight: 4 },
      { kind: 'ranged', from: 6, weight: 3 }, { kind: 'tank', from: 25, weight: 2 },
      { kind: 'elite', from: 41, weight: 2 },
    ],
    hazards: [{ kind: 'spikes', from: 21 }],
    bossName: 'Blood Stag', bossGuards: ['assassin', 'assassin'],
    challenge: { hp: 1.4, dmg: 1.25 },
  },
  {
    index: 3, id: 'frozen_abyss', name: 'Frozen Abyss',
    blurb: 'Ice caverns and slippery floors.',
    palette: { sky: '#07151f', ground: '#0f2a38', accent: '#4cd6ff', moon: '#e8fbff' },
    music: 'abyss',
    roster: [
      { kind: 'melee', from: 1, weight: 3 }, { kind: 'ranged', from: 1, weight: 3 },
      { kind: 'tank', from: 10, weight: 3 }, { kind: 'assassin', from: 20, weight: 2 },
      { kind: 'elite', from: 30, weight: 2 },
    ],
    hazards: [{ kind: 'ice', from: 11 }, { kind: 'spikes', from: 51 }],
    bossName: 'Glacier Sovereign', bossGuards: ['ranged', 'tank'],
    challenge: { hp: 1.5, dmg: 1.3 },
  },
  {
    index: 4, id: 'infernal_fortress', name: 'Infernal Fortress',
    blurb: 'Lava arenas and elite warriors.',
    palette: { sky: '#1f0a04', ground: '#33140a', accent: '#ff7a1a', moon: '#ffcf8a' },
    music: 'fortress',
    roster: [
      { kind: 'melee', from: 1, weight: 2 }, { kind: 'tank', from: 1, weight: 3 },
      { kind: 'assassin', from: 10, weight: 2 }, { kind: 'elite', from: 10, weight: 4 },
      { kind: 'ranged', from: 12, weight: 2 },
    ],
    hazards: [{ kind: 'lava', from: 21 }, { kind: 'spikes', from: 41 }],
    bossName: 'Magma Tyrant', bossGuards: ['elite', 'tank'],
    challenge: { hp: 1.7, dmg: 1.35 },
  },
  {
    index: 5, id: 'void_realm', name: 'Void Realm',
    blurb: 'Surreal dimensions and extreme challenges.',
    palette: { sky: '#0b0418', ground: '#1c0a33', accent: '#c04bff', moon: '#7ff3ff' },
    music: 'void',
    roster: [
      { kind: 'melee', from: 1, weight: 1 }, { kind: 'assassin', from: 1, weight: 3 },
      { kind: 'ranged', from: 1, weight: 2 }, { kind: 'tank', from: 1, weight: 2 },
      { kind: 'elite', from: 1, weight: 4 },
    ],
    hazards: [{ kind: 'rift', from: 21 }, { kind: 'lava', from: 41 }, { kind: 'ice', from: 61 }],
    bossName: 'The Hollow King', bossGuards: ['elite', 'assassin', 'ranged'],
    challenge: { hp: 2.0, dmg: 1.5 },
  },
];