import { FIGHTERS, GEAR, GearSlot, MAX_GEAR_LEVEL, getFighter, getGear } from './catalog';

export const SLOTS: GearSlot[] = ['weapon', 'helmet', 'chest', 'gloves', 'boots'];

export interface GearState {
  owned: Record<string, number>;               // gear id -> upgrade level (1..5)
  fighters: string[];                          // owned fighter ids
  equipped: Record<GearSlot, string | null>;   // the weapon slot is never empty
  fighter: string;                             // selected fighter id
}

const DEFAULT_WEAPON = 'shadow_katana';
const ID_RE = /^[a-z0-9_]{1,48}$/;

export function defaultGear(): GearState {
  return {
    owned: Object.fromEntries(GEAR.filter((x) => x.free).map((x) => [x.id, 1])),
    fighters: FIGHTERS.filter((x) => x.free).map((x) => x.id),
    equipped: { weapon: DEFAULT_WEAPON, helmet: 'shadow_helmet', chest: null, gloves: null, boots: null },
    fighter: 'shadow',
  };
}

/** Never trust stored data. Free items always exist, levels are clamped, and equipment must be owned and fit its slot. */
export function sanitizeGear(raw: unknown): GearState {
  const out = defaultGear();
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;

  const owned = { ...out.owned };
  if (typeof r.owned === 'object' && r.owned !== null) {
    for (const [id, v] of Object.entries(r.owned as Record<string, unknown>).slice(0, 200)) {
      if (!ID_RE.test(id)) continue; // well-formed unknown ids are kept so a catalog change cannot delete a purchase
      const lvl = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 1;
      owned[id] = Math.min(MAX_GEAR_LEVEL, Math.max(owned[id] ?? 1, lvl, 1));
    }
  }
  out.owned = owned;

  const eq = (typeof r.equipped === 'object' && r.equipped !== null ? r.equipped : {}) as Record<string, unknown>;
  for (const slot of SLOTS) {
    const v = eq[slot];
    if (typeof v === 'string' && getGear(v)?.slot === slot && owned[v]) out.equipped[slot] = v;
    else if (v === null && slot !== 'weapon') out.equipped[slot] = null;
    else if (v !== undefined) out.equipped[slot] = slot === 'weapon' ? DEFAULT_WEAPON : null;
  }

  const fighters = new Set(out.fighters);
  if (Array.isArray(r.fighters)) {
    for (const v of r.fighters.slice(0, 50)) if (typeof v === 'string' && ID_RE.test(v)) fighters.add(v);
  }
  out.fighters = Array.from(fighters);
  out.fighter = typeof r.fighter === 'string' && fighters.has(r.fighter) && getFighter(r.fighter) ? r.fighter : 'shadow';
  return out;
}