import { QUALITY_ORDER, Quality } from '../config/graphics';
import {
  DEFAULT_CHARACTER_ID, DEFAULT_WEAPON_ID, freeIds, getCharacter, getWeapon,
} from '../cosmetics/catalog';
import { LEVELS_PER_WORLD, levelId, parseLevelId } from '../levels/common';
import { SKILLS } from '../skills/catalog';
import { GearState, defaultGear, sanitizeGear } from '../gear/state';

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
  soundVolume: number;   // 0..1 in steps of 0.05 (used while sound is on)
  musicVolume: number;
  vibration: boolean;
  graphics: Quality;
  fps: 30 | 60;
  language: 'en';        // only English exists so far
  controls: 'buttons' | 'joystick';
  controlSize: number;   // 0.8..1.3, scales the on-screen controls
}

export interface DailyState {
  lastClaimAt: number;   // ms timestamp of the last claim (0 = never)
  streak: number;        // consecutive claims
  totalClaims: number;
  maxSeen: number;       // latest device time ever observed (used to catch clocks moved backwards)
}

export interface Lifetime {
  kills: number; blocks: number; dodges: number; specials: number;
  maxCombo: number; runs: number; wins: number;
}

export interface AchievementsState { claimed: string[] }

export interface HeroState {
  xp: number;
  ranks: Record<string, number>;   // skill id -> rank
}

export interface SaveData {
  version: 4;
  coins: number;
  levels: Record<string, LevelRecord>;
  inventory: Inventory;
  settings: Settings;
  daily: DailyState;
  lifetime: Lifetime;
  achievements: AchievementsState;
  hero: HeroState;
  gear: GearState;
}

export function defaultSettings(): Settings {
  return {
    sound: true, music: true, soundVolume: 1, musicVolume: 1, vibration: true,
    graphics: 'medium', fps: 60, language: 'en', controls: 'buttons', controlSize: 1,
  };
}

export function defaultInventory(): Inventory {
  return {
    characters: freeIds('character'), weapons: freeIds('weapon'),
    equippedCharacter: DEFAULT_CHARACTER_ID, equippedWeapon: DEFAULT_WEAPON_ID,
  };
}

export function defaultDaily(): DailyState {
  return { lastClaimAt: 0, streak: 0, totalClaims: 0, maxSeen: 0 };
}

export function defaultLifetime(): Lifetime {
  return { kills: 0, blocks: 0, dodges: 0, specials: 0, maxCombo: 0, runs: 0, wins: 0 };
}

export function defaultHero(): HeroState {
  return { xp: 0, ranks: {} };
}

export function defaultSave(): SaveData {
  return {
    version: 4, coins: 0, levels: {}, inventory: defaultInventory(), settings: defaultSettings(),
    daily: defaultDaily(), lifetime: defaultLifetime(), achievements: { claimed: [] }, hero: defaultHero(), gear: defaultGear(),
  };
}

const int = (v: unknown, lo: number, hi: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.min(hi, Math.max(lo, n));
};

const ID_RE = /^[a-z0-9_]{1,48}$/;
const YEAR_2100_MS = 4_102_444_800_000;

const volume = (v: unknown, d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(1, Math.max(0, v)) * 20) / 20 : d;

export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const size = typeof r.controlSize === 'number' && Number.isFinite(r.controlSize) ? r.controlSize : d.controlSize;
  return {
    sound: typeof r.sound === 'boolean' ? r.sound : d.sound,
    music: typeof r.music === 'boolean' ? r.music : d.music,
    soundVolume: volume(r.soundVolume, d.soundVolume),
    musicVolume: volume(r.musicVolume, d.musicVolume),
    vibration: typeof r.vibration === 'boolean' ? r.vibration : d.vibration,
    graphics: QUALITY_ORDER.includes(r.graphics as Quality) ? (r.graphics as Quality) : d.graphics,
    fps: r.fps === 30 ? 30 : 60,
    language: 'en',
    controls: r.controls === 'joystick' ? 'joystick' : 'buttons',
    controlSize: Math.round(Math.min(1.3, Math.max(0.8, size)) * 20) / 20,
  };
}

export function sanitizeDaily(raw: unknown): DailyState {
  const d = defaultDaily();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const lastClaimAt = int(r.lastClaimAt, 0, YEAR_2100_MS);
  return {
    lastClaimAt,
    streak: int(r.streak, 0, 100_000),
    totalClaims: int(r.totalClaims, 0, 1_000_000),
    maxSeen: Math.max(int(r.maxSeen, 0, YEAR_2100_MS), lastClaimAt), // can never be older than the last claim
  };
}

export function sanitizeLifetime(raw: unknown): Lifetime {
  const d = defaultLifetime();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const out = { ...d };
  (Object.keys(d) as (keyof Lifetime)[]).forEach((k) => { out[k] = int(r[k], 0, 1_000_000_000); });
  return out;
}

/** Well-formed unknown ids are kept so a catalog change can never silently un-claim a reward. */
export function sanitizeClaimed(raw: unknown): string[] {
  const out = new Set<string>();
  const list = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).claimed : null;
  if (Array.isArray(list)) {
    for (const v of list.slice(0, 500)) if (typeof v === 'string' && ID_RE.test(v)) out.add(v);
  }
  return Array.from(out);
}

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
/** Unknown skills are dropped, ranks are capped, and ranks that cost more points than the XP allows are cleared. */
export function sanitizeHero(raw: unknown): HeroState {
  const d = defaultHero();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const xp = int(r.xp, 0, 1_000_000_000);
  const rawRanks = typeof r.ranks === 'object' && r.ranks !== null ? (r.ranks as Record<string, unknown>) : {};
  const ranks: Record<string, number> = {};
  let spent = 0;
  for (const s of SKILLS) {
    const n = int(rawRanks[s.id], 0, s.maxRank);
    if (n > 0) { ranks[s.id] = n; spent += n; }
  }
  // 1 point per level above 1, and the level cap is 20, so no more than 19 points can ever exist
  const level = (() => { let l = 1; while (l < 20 && xp >= 50 * l * (l + 1)) l += 1; return l; })();
  return { xp, ranks: spent > level - 1 ? {} : ranks };
}

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
  out.daily = sanitizeDaily(r.daily);
  out.lifetime = sanitizeLifetime(r.lifetime);
  out.achievements = { claimed: sanitizeClaimed(r.achievements) };
  out.hero = sanitizeHero(r.hero);
  out.gear = sanitizeGear(r.gear);
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