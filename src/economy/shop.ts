import { getItem, priceOf, starGateOf } from '../cosmetics/catalog';
import type { ItemKind } from '../cosmetics/types';
import type { SaveData } from '../persistence/saveData';

export type PurchaseFailure =
  | 'unknown_item' | 'already_owned' | 'insufficient_coins' | 'need_stars' | 'invalid_price';
export type PurchaseResult = { ok: true; price: number } | { ok: false; reason: PurchaseFailure };
export type ItemState = 'equipped' | 'owned' | 'locked' | 'buyable';

export function totalStars(save: SaveData): number {
  let n = 0;
  for (const r of Object.values(save.levels)) n += r.stars;
  return n;
}

const listOf = (save: SaveData, kind: ItemKind): string[] =>
  kind === 'character' ? save.inventory.characters : save.inventory.weapons;

export const owns = (save: SaveData, kind: ItemKind, id: string): boolean => listOf(save, kind).includes(id);

export const equippedId = (save: SaveData, kind: ItemKind): string =>
  kind === 'character' ? save.inventory.equippedCharacter : save.inventory.equippedWeapon;

export function itemState(save: SaveData, kind: ItemKind, id: string): ItemState {
  const item = getItem(kind, id);
  if (!item) return 'locked';
  if (equippedId(save, kind) === id) return 'equipped';
  if (owns(save, kind, id)) return 'owned';
  return totalStars(save) >= starGateOf(kind, item) ? 'buyable' : 'locked';
}

/**
 * Pure and atomic: validates everything first, then returns a new save.
 * On any failure the SAME save object comes back, unchanged.
 */
export function purchaseItem(
  save: SaveData, kind: ItemKind, id: string,
): { save: SaveData; result: PurchaseResult } {
  const fail = (reason: PurchaseFailure) => ({ save, result: { ok: false, reason } as PurchaseResult });

  const item = getItem(kind, id);
  if (!item) return fail('unknown_item');
  if (owns(save, kind, id)) return fail('already_owned');

  const price = priceOf(kind, item);
  if (!Number.isInteger(price) || price < 0) return fail('invalid_price');
  if (totalStars(save) < starGateOf(kind, item)) return fail('need_stars');
  if (save.coins < price) return fail('insufficient_coins');

  const inv = save.inventory;
  const inventory = kind === 'character'
    ? { ...inv, characters: [...inv.characters, id] }
    : { ...inv, weapons: [...inv.weapons, id] };
  return { save: { ...save, coins: save.coins - price, inventory }, result: { ok: true, price } };
}

/** Only owned, known items can be equipped. */
export function equipItem(save: SaveData, kind: ItemKind, id: string): { save: SaveData; ok: boolean } {
  if (!getItem(kind, id) || !owns(save, kind, id)) return { save, ok: false };
  if (equippedId(save, kind) === id) return { save, ok: true };
  const inv = save.inventory;
  const inventory = kind === 'character'
    ? { ...inv, equippedCharacter: id }
    : { ...inv, equippedWeapon: id };
  return { save: { ...save, inventory }, ok: true };
}