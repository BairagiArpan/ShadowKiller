import type { EnemyKind } from '../engine/types';
import type { CharacterFeature, CharacterVisual, WeaponVisual } from './types';

const look = (
  accent: string, trim: string, eye: string, features: CharacterFeature[],
  widthScale = 1, heightScale = 1, headScale = 1,
): CharacterVisual => ({ body: '#b3263e', accent, trim, eye, features, widthScale, heightScale, headScale });

/**
 * PLACEHOLDER ART. Body color comes from the enemy definition each frame. Silhouettes differ by
 * feature set and drawing scale (within +-10%). Hitboxes are identical for every enemy.
 */
export const ENEMY_LOOKS: Record<Exclude<EnemyKind, 'boss'>, CharacterVisual> = {
  melee:    look('#6b1020', '#ff8a9a', '#ffd24a', ['hood']),
  ranged:   look('#145c54', '#7ff3ff', '#d4fffb', ['hat', 'scarf'], 0.92, 1.04, 0.95),
  assassin: look('#7a5a10', '#ffe9a0', '#ffffff', ['mask', 'tail'], 0.92, 1.06, 0.95),
  tank:     look('#2d3748', '#cbd5e0', '#ffd24a', ['pauldrons', 'spikes'], 1.1, 0.96, 1.05),
  elite:    look('#4a1457', '#e0a8ff', '#ffffff', ['horns', 'cape'], 1.04, 1.06, 1.05),
};

export const BOSS_LOOKS: Record<number, CharacterVisual> = {
  1: look('#8a4a10', '#ffd08a', '#fff0c0', ['horns', 'pauldrons', 'cape'], 1.1, 1.08, 1.05),
  2: look('#6b1020', '#ff9aa8', '#ffd0d6', ['horns', 'spikes', 'tail'], 1.08, 1.1, 1.1),
  3: look('#1f5f7a', '#e8fbff', '#ffffff', ['halo', 'pauldrons', 'cape'], 1.1, 1.08, 1.05),
  4: look('#6b2a08', '#ffd08a', '#fff0c0', ['horns', 'pauldrons', 'spikes'], 1.1, 1.1, 1.05),
  5: look('#3a1060', '#7ff3ff', '#ffffff', ['halo', 'horns', 'cape'], 1.08, 1.1, 1.1),
};

export function enemyLookFor(kind: EnemyKind, world: number): CharacterVisual {
  return kind === 'boss' ? (BOSS_LOOKS[world] ?? BOSS_LOOKS[1]) : ENEMY_LOOKS[kind];
}

const gear = (
  shape: WeaponVisual['shape'], length: number, blade: string, glow: string,
): WeaponVisual => ({
  shape, length, blade, handle: '#2a1018', glow, trail: glow, hitFx: 'spark', hitColor: glow,
});

export const ENEMY_WEAPONS: Record<EnemyKind, WeaponVisual> = {
  melee:    gear('katana', 34, '#ff7788', '#ff5566'),
  ranged:   gear('staff', 40, '#7ff3ff', '#37d0c4'),
  assassin: gear('daggers', 28, '#ffe9a0', '#e9c46a'),
  tank:     gear('axe', 40, '#cbd5e0', '#9aa3b5'),
  elite:    gear('dual', 40, '#e0a8ff', '#b04bff'),
  boss:     gear('greatsword', 50, '#ffb06a', '#ff7a1a'),
};
export const enemyWeaponFor = (kind: EnemyKind): WeaponVisual => ENEMY_WEAPONS[kind];

// Kept for older imports.
export const ENEMY_LOOK: CharacterVisual = ENEMY_LOOKS.melee;
export const ENEMY_WEAPON: WeaponVisual = ENEMY_WEAPONS.melee;