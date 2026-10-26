import { SHOP } from '../economy/economy.config';
import { CHARACTERS } from './characters';
import type { CharacterSkin, ItemKind, WeaponSkin } from './types';
import { WEAPONS } from './weapons';

export { CHARACTERS, WEAPONS };
export type AnyItem = CharacterSkin | WeaponSkin;

export const DEFAULT_CHARACTER_ID = CHARACTERS[0].id;
export const DEFAULT_WEAPON_ID = WEAPONS[0].id;

const charById = new Map(CHARACTERS.map((c) => [c.id, c]));
const weaponById = new Map(WEAPONS.map((w) => [w.id, w]));

export const getCharacter = (id: string): CharacterSkin | undefined => charById.get(id);
export const getWeapon = (id: string): WeaponSkin | undefined => weaponById.get(id);
export const resolveCharacter = (id: string): CharacterSkin => charById.get(id) ?? CHARACTERS[0];
export const resolveWeapon = (id: string): WeaponSkin => weaponById.get(id) ?? WEAPONS[0];

export function itemsOf(kind: ItemKind): readonly AnyItem[] {
  return kind === 'character' ? CHARACTERS : WEAPONS;
}
export function getItem(kind: ItemKind, id: string): AnyItem | undefined {
  return kind === 'character' ? charById.get(id) : weaponById.get(id);
}
export function freeIds(kind: ItemKind): string[] {
  return itemsOf(kind).filter((i) => i.free).map((i) => i.id);
}

/** Coin price. Free items cost 0; otherwise per-item override, else the rarity table. */
export function priceOf(kind: ItemKind, item: AnyItem): number {
  if (item.free) return 0;
  const override = SHOP.priceOverrides[item.id];
  return override !== undefined ? override : SHOP.prices[kind][item.rarity];
}

/** Total stars needed before purchase. */
export function starGateOf(kind: ItemKind, item: AnyItem): number {
  return item.free ? 0 : SHOP.starGate[kind][item.rarity];
}