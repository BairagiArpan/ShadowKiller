import { CAPS, ArmorSlot, GearItem, MAX_GEAR_LEVEL, getFighter, getGear, statAt, upgradeCost, CATEGORY_REACH } from './catalog';
import { SLOTS } from './state';
import { NO_PERKS, Perks } from '../engine/perks';
import type { SaveData } from '../persistence/saveData';

export type GearFailure = 'unknown' | 'already_owned' | 'not_owned' | 'insufficient_coins' | 'max_level';
export type GearResult = { ok: true; cost: number } | { ok: false; reason: GearFailure };

export const levelOf = (save: SaveData, id: string): number => save.gear.owned[id] ?? 0;
export const isEquipped = (save: SaveData, item: GearItem): boolean => save.gear.equipped[item.slot] === item.id;

export interface Ratings { hp: number; atk: number; def: number; speed: number }

/** What the character sheet shows: HP and ATK and SPEED start at 100, DEF at 0. */
export function totalStats(save: SaveData): Ratings {
  const t = { hp: 0, atk: 0, def: 0, speed: 0 };
  const add = (s: { atk: number; def: number; hp: number; speed: number }, level: number) => {
    t.hp += statAt(s.hp, level); t.atk += statAt(s.atk, level);
    t.def += statAt(s.def, level); t.speed += statAt(s.speed, level);
  };
  const f = getFighter(save.gear.fighter);
  if (f) add(f.stats, 1);
  for (const slot of SLOTS) {
    const id = save.gear.equipped[slot];
    const item = id ? getGear(id) : undefined;
    const lvl = id ? levelOf(save, id) : 0;
    if (item && lvl > 0) add(item.stats, lvl);
  }
  const r = (n: number) => Math.round(n * 10) / 10;
  return { hp: r(100 + t.hp), atk: r(100 + t.atk), def: r(t.def), speed: r(100 + t.speed) };
}

const r4 = (n: number): number => Math.round(n * 10000) / 10000;

/** Turns the character sheet into combat bonuses, always inside the hard caps. */
export function gearPerks(save: SaveData): Perks {
  const t = totalStats(save);
  return {
    ...NO_PERKS,
    damage: r4(Math.min(CAPS.damage, t.atk / 100)),
    maxHp: Math.min(CAPS.hp, Math.max(0, Math.round(t.hp - 100))),
    damageTaken: r4(Math.max(CAPS.damageTaken, 100 / (100 + t.def))),
    moveSpeed: r4(Math.min(CAPS.moveSpeed, t.speed / 100)),
    reach: r4(Math.min(CAPS.reach, (() => {
      const id = save.gear.equipped.weapon;
      const cat = id ? getGear(id)?.category : undefined;
      return cat ? CATEGORY_REACH[cat] : 1;
    })())),
  };
}

const fail = (save: SaveData, reason: GearFailure) => ({ save, result: { ok: false, reason } as GearResult });

/** Pure and atomic. On any refusal the SAME save object comes back, unchanged. */
export function buyGear(save: SaveData, id: string): { save: SaveData; result: GearResult } {
  const item = getGear(id);
  if (!item) return fail(save, 'unknown');
  if (levelOf(save, id) > 0) return fail(save, 'already_owned');
  if (!Number.isInteger(item.price) || item.price < 0) return fail(save, 'unknown');
  if (save.coins < item.price) return fail(save, 'insufficient_coins');
  return {
    save: { ...save, coins: save.coins - item.price, gear: { ...save.gear, owned: { ...save.gear.owned, [id]: 1 } } },
    result: { ok: true, cost: item.price },
  };
}

export function upgradeGear(save: SaveData, id: string): { save: SaveData; result: GearResult } {
  const item = getGear(id);
  if (!item) return fail(save, 'unknown');
  const lvl = levelOf(save, id);
  if (lvl < 1) return fail(save, 'not_owned');
  if (lvl >= MAX_GEAR_LEVEL) return fail(save, 'max_level');
  const cost = upgradeCost(item, lvl);
  if (save.coins < cost) return fail(save, 'insufficient_coins');
  return {
    save: { ...save, coins: save.coins - cost, gear: { ...save.gear, owned: { ...save.gear.owned, [id]: lvl + 1 } } },
    result: { ok: true, cost },
  };
}

export function equipGear(save: SaveData, id: string): { save: SaveData; ok: boolean } {
  const item = getGear(id);
  if (!item || levelOf(save, id) < 1) return { save, ok: false };
  if (save.gear.equipped[item.slot] === id) return { save, ok: true };
  return { save: { ...save, gear: { ...save.gear, equipped: { ...save.gear.equipped, [item.slot]: id } } }, ok: true };
}

/** Armor can come off. The weapon slot can never be empty. */
export function unequipGear(save: SaveData, slot: ArmorSlot): { save: SaveData; ok: boolean } {
  if (save.gear.equipped[slot] === null) return { save, ok: false };
  return { save: { ...save, gear: { ...save.gear, equipped: { ...save.gear.equipped, [slot]: null } } }, ok: true };
}

export function buyFighter(save: SaveData, id: string): { save: SaveData; result: GearResult } {
  const f = getFighter(id);
  if (!f) return fail(save, 'unknown');
  if (save.gear.fighters.includes(id)) return fail(save, 'already_owned');
  if (!Number.isInteger(f.price) || f.price < 0) return fail(save, 'unknown');
  if (save.coins < f.price) return fail(save, 'insufficient_coins');
  return {
    save: { ...save, coins: save.coins - f.price, gear: { ...save.gear, fighters: [...save.gear.fighters, id] } },
    result: { ok: true, cost: f.price },
  };
}

export function selectFighter(save: SaveData, id: string): { save: SaveData; ok: boolean } {
  if (!getFighter(id) || !save.gear.fighters.includes(id)) return { save, ok: false };
  if (save.gear.fighter === id) return { save, ok: true };
  return { save: { ...save, gear: { ...save.gear, fighter: id } }, ok: true };
}