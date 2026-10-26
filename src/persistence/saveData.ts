import { QUALITY_ORDER, Quality } from '../config/graphics';
import {
  DEFAULT_CHARACTER_ID, DEFAULT_WEAPON_ID, freeIds, getCharacter, getWeapon,
} from '../cosmetics/catalog';
import { LEVELS_PER_WORLD, levelId, parseLevelId } from '../levels/common';

export interface LevelRecord {
  completed: boolean;
  stars: number;          // 0..3, best ever
  bestScore: number;
  challengeClears: number;
}

export interface Inventory {
  characters: string[];   // owned character ids
  weapons: string[];      // owned weapon ids
  equippedCharacter: string;
  equippedWeapon: string;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  graphics: Quality;
  fps: 30 | 60;
  language: 'en';       // only English exists so far
  controlSize: number;  // 0.8..1.3, scales the on-screen buttons
}

export function defaultSettings(): Settings {
  return { sound: true, music: true, graphics: 'medium', fps: 60, language: 'en', controlSize: 1 };
}

export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const size = typeof r.controlSize === 'number' && Number.isFinite(r.controlSize) ? r.controlSize : d.controlSize;
  return {
    sound: typeof r.sound === 'boolean' ? r.sound : d.sound,
    music: typeof r.music === 'boolean' ? r.music : d.music,
    graphics: QUALITY_ORDER.includes(r.graphics as Quality) ? (r.graphics as Quality) : d.graphics,
    fps: r.fps === 30 ? 30 : 60,
    language: 'en',
    controlSize: Math.round(Math.min(1.3, Math.max(0.8, size)) * 20) / 20,
  };
}

export interface SaveData {
  version: 3;
  coins: number;
  levels: Record<string, LevelRecord>;
  inventory: Inventory;
  settings: Settings

}

export function defaultInventory(): Inventory {
  return {
    characters: freeIds('character'), weapons: freeIds('weapon'),
    equippedCharacter: DEFAULT_CHARACTER_ID, equippedWeapon: DEFAULT_WEAPON_ID,
  };
}

export function defaultSave(): SaveData {
  return { version: 3, coins: 0, levels: {}, inventory: defaultInventory(), settings: defaultSettings() };
}

const int = (v: unknown, lo: number, hi: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.min(hi, Math.max(lo, n));
};

const ID_RE = /^[a-z0-9_]{1,48}$/;

/** Free items are always present. Well-formed unknown ids are KEPT so a catalog change can never delete a purchase. */
function sanitizeIdList(raw: unknown, free: string[]): string[] {
  const out = new Set<string>(free);
  if (Array.isArray(raw)) {
    for (const v of raw.slice(0, 200)) if (typeof v === 'string' && ID_RE.test(v)) out.add(v);
  }
  return Array.from(out);
}

function sanitizeInventory(raw: unknown): Inventory {
  const base = defaultInventory();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Record<string, unknown>;
  const characters = sanitizeIdList(r.characters, base.characters);
  const weapons = sanitizeIdList(r.weapons, base.weapons);
  const eqC = r.equippedCharacter;
  const eqW = r.equippedWeapon;
  return {
    characters, weapons,
    equippedCharacter: typeof eqC === 'string' && characters.includes(eqC) && getCharacter(eqC) ? eqC : DEFAULT_CHARACTER_ID,
    equippedWeapon: typeof eqW === 'string' && weapons.includes(eqW) && getWeapon(eqW) ? eqW : DEFAULT_WEAPON_ID,
  };
}

/** Never trust stored data: clamp, drop unknown keys, repair inconsistent records. Accepts older versions. */
export function sanitizeSave(raw: unknown): SaveData {
  const out = defaultSave();
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;
  out.coins = int(r.coins, 0, 1_000_000_000);
  if (typeof r.levels === 'object' && r.levels !== null) {
    for (const [id, v] of Object.entries(r.levels as Record<string, unknown>)) {
      if (!parseLevelId(id) || typeof v !== 'object' || v === null) continue;
      const rec = v as Record<string, unknown>;
      let stars = int(rec.stars, 0, 3);
      const completed = rec.completed === true || stars > 0;
      if (completed && stars < 1) stars = 1;
      out.levels[id] = {
        completed, stars,
        bestScore: int(rec.bestScore, 0, 1_000_000_000),
        challengeClears: int(rec.challengeClears, 0, 1_000_000),
      };
    }
  }
  out.inventory = sanitizeInventory(r.inventory);
  out.settings = sanitizeSettings(r.settings);
  return out;
}

export function starsInWorld(save: SaveData, world: number): number {
  let n = 0;
  for (let l = 1; l <= LEVELS_PER_WORLD; l++) n += save.levels[levelId(world, l)]?.stars ?? 0;
  return n;
}

export function clearedInWorld(save: SaveData, world: number): number {
  let n = 0;
  for (let l = 1; l <= LEVELS_PER_WORLD; l++) if (save.levels[levelId(world, l)]?.completed) n += 1;
  return n;
}