import { expect, it, describe } from '@jest/globals';
import { SHOP, REWARDS } from '../../economy/economy.config';
import { getWorldLevels } from '../../levels';
import { WORLD_COUNT } from '../../levels/common';
import {
  CHARACTERS, DEFAULT_CHARACTER_ID, DEFAULT_WEAPON_ID, WEAPONS, getItem, priceOf, starGateOf,
} from '../catalog';
import { RARITY_ORDER } from '../types';

const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};

describe('catalog size and starters', () => {
  it('has at least 20 character skins and 20 weapon skins', () => {
    expect(CHARACTERS.length).toBeGreaterThanOrEqual(20);
    expect(WEAPONS.length).toBeGreaterThanOrEqual(20);
  });
  it('has exactly two free items per category and the defaults are free', () => {
    expect(CHARACTERS.filter((c) => c.free)).toHaveLength(2);
    expect(WEAPONS.filter((w) => w.free)).toHaveLength(2);
    expect(getItem('character', DEFAULT_CHARACTER_ID)?.free).toBe(true);
    expect(getItem('weapon', DEFAULT_WEAPON_ID)?.free).toBe(true);
  });
  it('uses every rarity tier in both categories', () => {
    for (const list of [CHARACTERS, WEAPONS]) {
      RARITY_ORDER.forEach((r) => expect(list.some((i) => i.rarity === r)).toBe(true));
    }
  });
});

describe('uniqueness (distinct characters and weapons)', () => {
  it('has unique ids and names', () => {
    for (const list of [CHARACTERS, WEAPONS]) {
      expect(new Set(list.map((i) => i.id)).size).toBe(list.length);
      expect(new Set(list.map((i) => i.name)).size).toBe(list.length);
    }
  });
  it('gives every character a distinct color and silhouette', () => {
    expect(new Set(CHARACTERS.map((c) => c.visual.body)).size).toBe(CHARACTERS.length);
    const sig = (c: (typeof CHARACTERS)[number]) =>
      JSON.stringify([[...c.visual.features].sort(), c.visual.widthScale, c.visual.heightScale, c.visual.headScale]);
    expect(new Set(CHARACTERS.map(sig)).size).toBe(CHARACTERS.length);
    expect(new Set(CHARACTERS.map((c) => [...c.visual.features].sort().join('+'))).size).toBe(CHARACTERS.length);
  });
  it('gives every weapon a distinct look and covers the required types', () => {
    expect(new Set(WEAPONS.map((w) => `${w.visual.shape}:${w.visual.blade}`)).size).toBe(WEAPONS.length);
    const shapes = new Set(WEAPONS.map((w) => w.visual.shape));
    ['katana', 'dual', 'scythe', 'daggers', 'spear', 'chain'].forEach((s) => expect(shapes.has(s as never)).toBe(true));
  });
});

describe('cosmetic only', () => {
  const ALLOWED = ['id', 'name', 'rarity', 'free', 'blurb', 'visual'];
  it('skins carry no keys other than the cosmetic ones', () => {
    for (const item of [...CHARACTERS, ...WEAPONS]) {
      Object.keys(item).forEach((k) => expect(ALLOWED).toContain(k));
    }
  });
  it('keeps drawing scales and weapon lengths in safe ranges', () => {
    for (const c of CHARACTERS) {
      for (const s of [c.visual.widthScale, c.visual.heightScale, c.visual.headScale]) {
        expect(s).toBeGreaterThanOrEqual(0.9);
        expect(s).toBeLessThanOrEqual(1.1);
      }
    }
    for (const w of WEAPONS) {
      expect(w.visual.length).toBeGreaterThanOrEqual(28);
      expect(w.visual.length).toBeLessThanOrEqual(56);
    }
  });
  it('keeps every character readable on dark backgrounds', () => {
    for (const c of CHARACTERS) {
      expect(lum(c.visual.trim) >= 0.2 || lum(c.visual.body) >= 0.4).toBe(true);
    }
  });
});

describe('prices and gates', () => {
  it('free items cost 0 and everything else has a positive integer price', () => {
    for (const [kind, list] of [['character', CHARACTERS], ['weapon', WEAPONS]] as const) {
      for (const item of list) {
        const p = priceOf(kind, item);
        if (item.free) expect(p).toBe(0);
        else { expect(Number.isInteger(p)).toBe(true); expect(p).toBeGreaterThan(0); }
      }
    }
  });
  it('rarer items cost strictly more', () => {
    for (const kind of ['character', 'weapon'] as const) {
      for (let i = 1; i < RARITY_ORDER.length; i++) {
        expect(SHOP.prices[kind][RARITY_ORDER[i]]).toBeGreaterThan(SHOP.prices[kind][RARITY_ORDER[i - 1]]);
        expect(SHOP.starGate[kind][RARITY_ORDER[i]]).toBeGreaterThanOrEqual(SHOP.starGate[kind][RARITY_ORDER[i - 1]]);
      }
    }
  });
  it('weapons are never star-gated (coins only)', () => {
    WEAPONS.forEach((w) => expect(starGateOf('weapon', w)).toBe(0));
  });
});

describe('economy sanity', () => {
  const allLevels = Array.from({ length: WORLD_COUNT }, (_, i) => getWorldLevels(i + 1)).flat();
  const firstClear = allLevels.reduce((s, l) => s + l.baseReward, 0);
  const maxStars = allLevels.reduce((s, l) => s + 2 * Math.round(l.baseReward * REWARDS.starBonusFraction), 0);
  const totalCost =
    CHARACTERS.reduce((s, c) => s + priceOf('character', c), 0) + WEAPONS.reduce((s, w) => s + priceOf('weapon', w), 0);

  it('lets a new player afford the cheapest paid skin within the first 20 levels', () => {
    const first20 = getWorldLevels(1).slice(0, 20).reduce((s, l) => s + l.baseReward, 0);
    const cheapest = Math.min(
      ...CHARACTERS.filter((c) => !c.free).map((c) => priceOf('character', c)),
      ...WEAPONS.filter((w) => !w.free).map((w) => priceOf('weapon', w)),
    );
    expect(first20).toBeGreaterThanOrEqual(cheapest);
  });
  it('makes the full catalog neither trivial nor out of reach', () => {
    expect(totalCost).toBeGreaterThan(firstClear * 0.4);            // not trivially cheap
    expect(totalCost).toBeLessThanOrEqual(firstClear + maxStars);   // reachable by first clears + star bonuses
  });
});