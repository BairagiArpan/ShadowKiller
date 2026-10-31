import type { Rarity } from '../cosmetics/types';

export type ArmorSlot = 'helmet' | 'chest' | 'gloves' | 'boots';
export type GearSlot = 'weapon' | ArmorSlot;
export type WeaponCategory = 'katana' | 'dual' | 'spear' | 'scythe';

/** Bonuses at level 1. atk and speed are percentages, def is a rating, hp is added health. */
export interface GearStats { atk: number; def: number; hp: number; speed: number }

export interface GearItem {
  id: string; name: string; slot: GearSlot; category?: WeaponCategory;
  rarity: Rarity; stars: number; stats: GearStats; price: number; free?: boolean; blurb: string;
}
export interface FighterDef { id: string; name: string; blurb: string; stats: GearStats; price: number; free?: boolean }

export const MAX_GEAR_LEVEL = 5;
export const LEVEL_SCALE = 0.1; // each level adds 10% of the level-1 stats
export const UPGRADE_UNIT: Record<Rarity, number> = { common: 30, rare: 60, epic: 120, legendary: 200 };
/** Hard limits on what gear alone can give (skills stack on top). */
export const CAPS = { damage: 1.35, damageTaken: 0.75, moveSpeed: 1.15, hp: 30, reach: 1.15 };
/** Attack reach multiplier by weapon type. Only the player's reach changes; enemies are untouched. */
export const CATEGORY_REACH: Record<WeaponCategory, number> = { katana: 1, dual: 1, spear: 1.15, scythe: 1.08 };

const s = (atk: number, def: number, hp: number, speed: number): GearStats => ({ atk, def, hp, speed });
const g = (
  id: string, name: string, slot: GearSlot, rarity: Rarity, stars: number, stats: GearStats,
  price: number, blurb: string, category?: WeaponCategory, free = false,
): GearItem => ({ id, name, slot, category, rarity, stars, stats, price, free: free || undefined, blurb });

export const GEAR: GearItem[] = [
  g('shadow_katana', 'Shadow Katana', 'weapon', 'common', 3, s(0, 0, 0, 0), 0, 'The balanced starter blade.', 'katana', true),
  g('fire_blade', 'Fire Blade', 'weapon', 'rare', 3, s(8, 0, 0, 0), 400, 'Hits harder than a plain katana.', 'katana'),
  g('thunder_blade', 'Thunder Blade', 'weapon', 'rare', 4, s(5, 0, 0, 4), 450, 'Twin blades: lighter hits, quicker feet.', 'dual'),
  g('dragon_spear', 'Dragon Spear', 'weapon', 'epic', 4, s(11, 0, 0, 1), 900, 'A heavy spear with a long reach feel.', 'spear'),
  g('shadow_scythe', 'Shadow Scythe', 'weapon', 'epic', 5, s(14, 0, 0, 0), 1000, 'The strongest edge in the game.', 'scythe'),

  g('shadow_helmet', 'Shadow Helmet', 'helmet', 'common', 3, s(0, 3, 0, 0), 0, 'A plain starter helm.', undefined, true),
  g('samurai_helmet', 'Samurai Helmet', 'helmet', 'rare', 3, s(0, 5, 4, 0), 350, 'Sturdy and well padded.'),
  g('ninja_hood', 'Ninja Hood', 'helmet', 'rare', 3, s(0, 2, 0, 3), 350, 'Light cloth for a faster step.'),
  g('demon_mask', 'Demon Mask', 'helmet', 'epic', 4, s(2, 6, 6, 0), 900, 'A grim mask that feeds your strikes.'),

  g('shadow_armor', 'Shadow Armor', 'chest', 'common', 3, s(0, 5, 6, 0), 150, 'Simple dark plate.'),
  g('samurai_armor', 'Samurai Armor', 'chest', 'rare', 4, s(0, 8, 10, 0), 400, 'Layered lacquered plates.'),
  g('demon_armor', 'Demon Armor', 'chest', 'epic', 5, s(2, 9, 12, 0), 950, 'Forged from something that still burns.'),

  g('shadow_gloves', 'Shadow Gloves', 'gloves', 'common', 3, s(2, 2, 0, 0), 120, 'Good grip, light padding.'),
  g('ninja_gloves', 'Ninja Gloves', 'gloves', 'rare', 3, s(3, 3, 0, 1), 350, 'Quick hands.'),
  g('demon_gauntlets', 'Demon Gauntlets', 'gloves', 'epic', 4, s(4, 4, 0, 0), 850, 'Heavy knuckles for heavy blows.'),

  g('shadow_boots', 'Shadow Boots', 'boots', 'common', 3, s(0, 2, 0, 3), 120, 'Quiet soles.'),
  g('ninja_boots', 'Ninja Boots', 'boots', 'rare', 3, s(0, 2, 0, 5), 350, 'Made for sprinting across rooftops.'),
  g('demon_greaves', 'Demon Greaves', 'boots', 'epic', 4, s(0, 4, 0, 4), 850, 'Armored but surprisingly quick.'),
];

export const FIGHTERS: FighterDef[] = [
  { id: 'shadow', name: 'Shadow', blurb: 'Balanced. The fighter everyone starts with.', stats: s(0, 0, 0, 0), price: 0, free: true },
  { id: 'ninja', name: 'Ninja', blurb: 'Fast on his feet.', stats: s(0, 0, 0, 8), price: 300 },
  { id: 'samurai', name: 'Samurai', blurb: 'Tough and steady.', stats: s(0, 5, 8, 0), price: 500 },
  { id: 'assassin', name: 'Assassin', blurb: 'Hits hard, quick, but fragile.', stats: s(8, 0, 0, 3), price: 700 },
];

const gearById = new Map(GEAR.map((x) => [x.id, x]));
const fighterById = new Map(FIGHTERS.map((x) => [x.id, x]));
export const getGear = (id: string): GearItem | undefined => gearById.get(id);
export const getFighter = (id: string): FighterDef | undefined => fighterById.get(id);
export const itemsInSlot = (slot: GearSlot): GearItem[] => GEAR.filter((x) => x.slot === slot);

/** A stat at a given upgrade level (level 1 = the base value). */
export const statAt = (base: number, level: number): number =>
  Math.round(base * (1 + LEVEL_SCALE * (Math.max(1, level) - 1)) * 10) / 10;

/** Coins to go from `level` to `level + 1`. */
export const upgradeCost = (item: GearItem, level: number): number => UPGRADE_UNIT[item.rarity] * level;