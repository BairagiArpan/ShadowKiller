import { getWorldLevels } from '../../levels';
import { WORLD_COUNT } from '../../levels/common';
import { SaveData, defaultSave, sanitizeSave } from '../../persistence/saveData';
import {
  CAPS, FIGHTERS, GEAR, GearItem, MAX_GEAR_LEVEL, UPGRADE_UNIT, getGear, statAt, upgradeCost,
} from '../catalog';
import {
  buyFighter, buyGear, equipGear, gearPerks, selectFighter, totalStats, unequipGear, upgradeGear,
} from '../progress';
import { SLOTS, defaultGear, sanitizeGear } from '../state';
import { describe, expect, it} from '@jest/globals';

const rich = (coins = 10000): SaveData => ({ ...defaultSave(), coins });
const power = (x: GearItem) => x.stats.atk + x.stats.def + x.stats.hp / 2 + x.stats.speed;
const best = SLOTS.map((slot) => GEAR.filter((x) => x.slot === slot).sort((a, b) => power(b) - power(a))[0]);

describe('catalog', () => {
  it('has unique ids, the four weapon categories and all four armor slots', () => {
    expect(new Set(GEAR.map((x) => x.id)).size).toBe(GEAR.length);
    expect(GEAR.length).toBeGreaterThanOrEqual(18);
    expect(new Set(GEAR.filter((x) => x.slot === 'weapon').map((x) => x.category))).toEqual(new Set(['katana', 'dual', 'spear', 'scythe']));
    SLOTS.forEach((slot) => expect(GEAR.filter((x) => x.slot === slot).length).toBeGreaterThanOrEqual(3));
    GEAR.forEach((x) => {
      expect(x.id).toMatch(/^[a-z0-9_]{1,48}$/);
      expect(x.stars).toBeGreaterThanOrEqual(1);
      expect(x.stars).toBeLessThanOrEqual(5);
      Object.values(x.stats).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    });
  });
  it('starts with exactly one free weapon and one free helmet; everything else costs a whole number of coins', () => {
    expect(GEAR.filter((x) => x.free).map((x) => x.id).sort()).toEqual(['shadow_helmet', 'shadow_katana']);
    GEAR.forEach((x) => {
      if (x.free) expect(x.price).toBe(0);
      else { expect(Number.isInteger(x.price)).toBe(true); expect(x.price).toBeGreaterThan(0); }
    });
    expect(FIGHTERS.filter((f) => f.free).map((f) => f.id)).toEqual(['shadow']);
    expect(FIGHTERS.map((f) => f.id)).toEqual(['shadow', 'ninja', 'samurai', 'assassin']);
  });
  it('level scaling is exact at level 1 and grows with level', () => {
    expect(statAt(10, 1)).toBe(10);
    expect(statAt(10, 5)).toBe(14);
    expect(statAt(0, 5)).toBe(0);
  });
  it('upgrade costs rise with level and rarity', () => {
    const rare = getGear('fire_blade')!;
    expect(upgradeCost(rare, 1)).toBe(UPGRADE_UNIT.rare);
    expect(upgradeCost(rare, 4)).toBe(4 * UPGRADE_UNIT.rare);
    expect(UPGRADE_UNIT.epic).toBeGreaterThan(UPGRADE_UNIT.rare);
    expect(UPGRADE_UNIT.rare).toBeGreaterThan(UPGRADE_UNIT.common);
  });
});

describe('caps and economy', () => {
  it('the best possible gear stays inside the hard caps but is clearly worth having', () => {
    const s = rich();
    s.gear = { ...defaultGear(), owned: Object.fromEntries(GEAR.map((x) => [x.id, MAX_GEAR_LEVEL])) };
    best.forEach((x) => { s.gear.equipped[x.slot] = x.id; });
    const p = gearPerks(s);
    expect(p.damage).toBeLessThanOrEqual(CAPS.damage);
    expect(p.damageTaken).toBeGreaterThanOrEqual(CAPS.damageTaken);
    expect(p.moveSpeed).toBeLessThanOrEqual(CAPS.moveSpeed);
    expect(p.maxHp).toBeLessThanOrEqual(CAPS.hp);
    expect(p.damage).toBeGreaterThan(1.15);
    expect(p.damageTaken).toBeLessThan(0.85);
  });
  it('a best-in-slot build costs a meaningful but reachable share of all first-clear coins', () => {
    const buy = best.reduce((n, x) => n + x.price, 0);
    const up = best.reduce((n, x) => {
      let c = 0;
      for (let l = 1; l < MAX_GEAR_LEVEL; l++) c += upgradeCost(x, l);
      return n + c;
    }, 0);
    const firstClear = Array.from({ length: WORLD_COUNT }, (_, i) => getWorldLevels(i + 1)).flat()
      .reduce((n, l) => n + l.baseReward, 0);
    expect(buy + up).toBeGreaterThan(firstClear * 0.2);
    expect(buy + up).toBeLessThan(firstClear * 0.8);
  });
});

describe('starting state', () => {
  it('equips the free katana and helmet, and the default stats match', () => {
    const s = defaultSave();
    expect(s.gear.equipped).toEqual({ weapon: 'shadow_katana', helmet: 'shadow_helmet', chest: null, gloves: null, boots: null });
    expect(totalStats(s)).toEqual({ hp: 100, atk: 100, def: 3, speed: 100 });
    const p = gearPerks(s);
    expect(p.damage).toBe(1);
    expect(p.maxHp).toBe(0);
    expect(p.moveSpeed).toBe(1);
    expect(p.damageTaken).toBeCloseTo(100 / 103, 3);
  });
});

describe('buying', () => {
  it('deducts exactly the price, adds the item at level 1 and does not mutate the input', () => {
    const s = rich(500);
    const out = buyGear(s, 'fire_blade');
    expect(out.result).toEqual({ ok: true, cost: 400 });
    expect(out.save.coins).toBe(100);
    expect(out.save.gear.owned.fire_blade).toBe(1);
    expect(s.coins).toBe(500);
    expect(s.gear.owned.fire_blade).toBeUndefined();
  });
  it('refuses when coins are short and returns the same save', () => {
    const s = rich(399);
    const out = buyGear(s, 'fire_blade');
    expect(out.result).toEqual({ ok: false, reason: 'insufficient_coins' });
    expect(out.save).toBe(s);
  });
  it('charges once for rapid double taps and refuses owned or unknown items', () => {
    let s = rich(500);
    const results = [];
    for (let i = 0; i < 4; i++) { const o = buyGear(s, 'fire_blade'); results.push(o.result); s = o.save; }
    expect(results[0].ok).toBe(true);
    results.slice(1).forEach((r) => expect(r).toEqual({ ok: false, reason: 'already_owned' }));
    expect(s.coins).toBe(100);
    expect(buyGear(rich(), 'shadow_katana').result).toEqual({ ok: false, reason: 'already_owned' });
    expect(buyGear(rich(), 'nope').result).toEqual({ ok: false, reason: 'unknown' });
  });
});

describe('equipping and stats', () => {
  it('only equips owned items and updates the character sheet', () => {
    const s = rich();
    expect(equipGear(s, 'fire_blade')).toEqual({ save: s, ok: false });
    const bought = buyGear(buyGear(s, 'fire_blade').save, 'demon_armor').save;
    const eq = equipGear(equipGear(bought, 'fire_blade').save, 'demon_armor').save;
    expect(eq.gear.equipped.weapon).toBe('fire_blade');
    expect(totalStats(eq)).toEqual({ hp: 112, atk: 108, def: 12, speed: 100 });
  });
  it('armor can be removed, the weapon slot cannot be emptied', () => {
    const s = defaultSave();
    const off = unequipGear(s, 'helmet');
    expect(off.ok).toBe(true);
    expect(totalStats(off.save).def).toBe(0);
    expect(unequipGear(off.save, 'helmet').ok).toBe(false);
    expect(unequipGear(off.save, 'chest').ok).toBe(false);
    expect(s.gear.equipped.helmet).toBe('shadow_helmet'); // input untouched
  });
  it('switching equipment keeps everything owned', () => {
    let s = buyGear(rich(), 'fire_blade').save;
    s = equipGear(equipGear(s, 'fire_blade').save, 'shadow_katana').save;
    expect(s.gear.owned.fire_blade).toBe(1);
  });
});

describe('upgrading', () => {
  it('costs unit x level, raises the stats and never goes past the maximum', () => {
    let s = buyGear(rich(), 'fire_blade').save;
    s = equipGear(s, 'fire_blade').save;
    const coins = s.coins;
    let spent = 0;
    for (let l = 1; l < MAX_GEAR_LEVEL; l++) {
      const o = upgradeGear(s, 'fire_blade');
      expect(o.result).toEqual({ ok: true, cost: 60 * l });
      spent += 60 * l;
      s = o.save;
    }
    expect(s.coins).toBe(coins - spent);
    expect(spent).toBe(600);
    expect(totalStats(s).atk).toBe(100 + statAt(8, 5));
    expect(upgradeGear(s, 'fire_blade').result).toEqual({ ok: false, reason: 'max_level' });
  });
  it('refuses unowned items and short coins without changing the save', () => {
    const s = rich(59);
    expect(upgradeGear(s, 'fire_blade').result).toEqual({ ok: false, reason: 'not_owned' });
    const short = upgradeGear({ ...s, gear: { ...s.gear, owned: { ...s.gear.owned, fire_blade: 1 } } }, 'fire_blade');
    expect(short.result).toEqual({ ok: false, reason: 'insufficient_coins' });
  });
  it('rapid taps can never push coins negative', () => {
    let s = rich(100);
    s = { ...s, gear: { ...s.gear, owned: { ...s.gear.owned, fire_blade: 1 } } };
    for (let i = 0; i < 20; i++) s = upgradeGear(s, 'fire_blade').save;
    expect(s.coins).toBeGreaterThanOrEqual(0);
  });
});

describe('fighters', () => {
  it('can be bought once, selected only when owned, and change the stats', () => {
    const s = rich();
    expect(selectFighter(s, 'ninja').ok).toBe(false);
    const bought = buyFighter(s, 'ninja');
    expect(bought.result).toEqual({ ok: true, cost: 300 });
    expect(buyFighter(bought.save, 'ninja').result).toEqual({ ok: false, reason: 'already_owned' });
    const sel = selectFighter(bought.save, 'ninja').save;
    expect(totalStats(sel).speed).toBe(108);
    expect(gearPerks(sel).moveSpeed).toBe(1.08);
    expect(buyFighter(rich(10), 'samurai').result).toEqual({ ok: false, reason: 'insufficient_coins' });
  });
});

describe('saving and loading', () => {
  it('old saves without gear get the defaults', () => {
    expect(sanitizeSave({ version: 4, coins: 5 }).gear).toEqual(defaultGear());
  });
  it('survives garbage and keeps free items', () => {
    expect(sanitizeGear('x')).toEqual(defaultGear());
    const g = sanitizeGear({ owned: {}, fighters: [] });
    expect(g.owned.shadow_katana).toBe(1);
    expect(g.fighters).toContain('shadow');
  });
  it('repairs equipment that is not owned or does not fit its slot', () => {
    const g = sanitizeGear({ equipped: { weapon: 'fire_blade', helmet: 'fire_blade', chest: 'demon_armor', gloves: 'ghost', boots: null } });
    expect(g.equipped).toEqual({ weapon: 'shadow_katana', helmet: null, chest: null, gloves: null, boots: null });
  });
  it('clamps levels, keeps well-formed unknown ids and drops malformed ones', () => {
    const g = sanitizeGear({ owned: { fire_blade: 99, future_item: 2, 'BAD ID': 3, thunder_blade: -4 } });
    expect(g.owned.fire_blade).toBe(MAX_GEAR_LEVEL);
    expect(g.owned.future_item).toBe(2);
    expect(g.owned['BAD ID']).toBeUndefined();
    expect(g.owned.thunder_blade).toBe(1);
  });
  it('selected fighter must be owned', () => {
    expect(sanitizeGear({ fighter: 'ninja' }).fighter).toBe('shadow');
    expect(sanitizeGear({ fighters: ['ninja'], fighter: 'ninja' }).fighter).toBe('ninja');
  });
  it('survives a JSON round trip of the whole save', () => {
    let s = rich(5000);
    s = buyGear(s, 'demon_armor').save;
    s = equipGear(s, 'demon_armor').save;
    s = upgradeGear(s, 'demon_armor').save;
    s = buyFighter(s, 'samurai').save;
    s = selectFighter(s, 'samurai').save;
    expect(sanitizeSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});