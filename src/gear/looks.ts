import { DEFAULT_CHARACTER_ID, DEFAULT_WEAPON_ID, resolveCharacter, resolveWeapon } from '../cosmetics/catalog';
import type { CharacterVisual, WeaponVisual } from '../cosmetics/types';
import type { SaveData } from '../persistence/saveData';

/** PLACEHOLDER ART. Shadow and the Shadow Katana are omitted on purpose: they use the starter skin looks. */
export const FIGHTER_LOOKS: Record<string, CharacterVisual> = {
  ninja: {
    body: '#1b2a3a', accent: '#4cc2ff', trim: '#bfe8ff', eye: '#ffffff',
    widthScale: 0.95, heightScale: 1.05, headScale: 0.95, features: ['mask', 'scarf', 'tail'],
  },
  samurai: {
    body: '#5a1f1f', accent: '#c9a227', trim: '#ffe08a', eye: '#ffd9a8',
    widthScale: 1.08, heightScale: 1, headScale: 1.05, features: ['pauldrons', 'hat'],
  },
  assassin: {
    body: '#101018', accent: '#8a1a2a', trim: '#ff6a85', eye: '#ff3b5c',
    widthScale: 0.95, heightScale: 1.06, headScale: 0.95, features: ['hood', 'mask', 'tail'],
  },
};

export const GEAR_WEAPON_LOOKS: Record<string, WeaponVisual> = {
  fire_blade: {
    shape: 'katana', length: 46, blade: '#ffb06a', handle: '#3d1405', glow: '#ff7a1a',
    trail: '#ff8c3a', hitFx: 'ember', hitColor: '#ffd08a',
  },
  thunder_blade: {
    shape: 'dual', length: 42, blade: '#fff0a0', handle: '#3a3a1c', glow: '#ffd93d',
    trail: '#fff0a0', hitFx: 'spark', hitColor: '#fff6b0',
  },
  dragon_spear: {
    shape: 'spear', length: 54, blade: '#ffd9a0', handle: '#5a2a10', glow: '#ff9a4d',
    trail: '#ffb070', hitFx: 'ember', hitColor: '#ffcf8a',
  },
  shadow_scythe: {
    shape: 'scythe', length: 54, blade: '#b78cff', handle: '#120826', glow: '#7a2cff',
    trail: '#9a5cff', hitFx: 'ring', hitColor: '#d9c8ff',
  },
};

export const fighterVisual = (id: string): CharacterVisual =>
  FIGHTER_LOOKS[id] ?? resolveCharacter(DEFAULT_CHARACTER_ID).visual;

export const gearWeaponVisual = (id: string): WeaponVisual =>
  GEAR_WEAPON_LOOKS[id] ?? resolveWeapon(DEFAULT_WEAPON_ID).visual;

/** True when the player has chosen an outfit or weapon skin other than the starter. That cosmetic wins. */
export const outfitOverrides = (save: SaveData): boolean => save.inventory.equippedCharacter !== DEFAULT_CHARACTER_ID;
export const skinOverrides = (save: SaveData): boolean => save.inventory.equippedWeapon !== DEFAULT_WEAPON_ID;

export function playerCharacterVisual(save: SaveData): CharacterVisual {
  return outfitOverrides(save) ? resolveCharacter(save.inventory.equippedCharacter).visual : fighterVisual(save.gear.fighter);
}

export function playerWeaponVisual(save: SaveData): WeaponVisual {
  const equipped = save.gear.equipped.weapon;
  return skinOverrides(save) ? resolveWeapon(save.inventory.equippedWeapon).visual : gearWeaponVisual(equipped ?? '');
}