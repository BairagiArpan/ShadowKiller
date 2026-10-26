export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ItemKind = 'character' | 'weapon';

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa3b5', rare: '#4da3ff', epic: '#b66bff', legendary: '#ffb524',
};

/*
 * COSMETIC-ONLY RULE: skins describe how something LOOKS. They must never contain
 * damage, reach, speed, health or any other gameplay number. A test enforces the key list.
 */

export type CharacterFeature =
  | 'hood' | 'horns' | 'cape' | 'hat' | 'mask' | 'spikes' | 'halo' | 'scarf' | 'pauldrons' | 'tail';

export interface CharacterVisual {
  body: string; accent: string; trim: string; eye: string;
  widthScale: number; heightScale: number; headScale: number; // 0.9..1.1, drawing only
  features: CharacterFeature[];
}

export interface CharacterSkin {
  id: string; name: string; rarity: Rarity; free?: boolean; blurb: string; visual: CharacterVisual;
}

export type WeaponShape =
  | 'katana' | 'dual' | 'daggers' | 'spear' | 'scythe' | 'chain' | 'axe' | 'staff' | 'greatsword';
export type HitFxStyle = 'spark' | 'ring' | 'slash' | 'ember' | 'frost';

export interface WeaponVisual {
  shape: WeaponShape;
  length: number;     // drawing length in px (28..56). Does NOT change attack reach.
  blade: string; handle: string; glow: string;
  trail: string;      // color of the slash trail
  hitFx: HitFxStyle; hitColor: string;
}

export interface WeaponSkin {
  id: string; name: string; rarity: Rarity; free?: boolean; blurb: string; visual: WeaponVisual;
}