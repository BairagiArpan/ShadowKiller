import { it, expect, describe } from '@jest/globals';
import { levelId } from '../../levels/common';
import { SaveData, defaultSave } from '../../persistence/saveData';
import { equipItem, itemState, purchaseItem, totalStars } from '../shop';

const rich = (coins = 5000): SaveData => ({ ...defaultSave(), coins });
function withStars(save: SaveData, stars: number): SaveData {
  const levels = { ...save.levels };
  for (let l = 1, left = stars; left > 0; l++, left -= 3) {
    levels[levelId(1, l)] = { completed: true, stars: Math.min(3, left), bestScore: 0, challengeClears: 0 };
  }
  return { ...save, levels };
}

describe('starting state', () => {
  it('owns and equips the free items only', () => {
    const s = defaultSave();
    expect(s.inventory.characters).toHaveLength(2);
    expect(s.inventory.weapons).toHaveLength(2);
    expect(itemState(s, 'character', s.inventory.equippedCharacter)).toBe('equipped');
    expect(itemState(s, 'character', 'dusk_wanderer')).toBe('owned');
    expect(itemState(s, 'weapon', 'ironbark_spear')).toBe('buyable');
    expect(itemState(s, 'character', 'lava_warlord')).toBe('locked'); // star gate
  });
});

describe('purchasing', () => {
  it('deducts exactly the price, adds the item, and does not mutate the input', () => {
    const s = rich(500);
    const out = purchaseItem(s, 'weapon', 'ironbark_spear'); // common = 110
    expect(out.result).toEqual({ ok: true, price: 110 });
    expect(out.save.coins).toBe(390);
    expect(out.save.inventory.weapons).toContain('ironbark_spear');
    expect(s.coins).toBe(500);
    expect(s.inventory.weapons).not.toContain('ironbark_spear');
  });

  it('refuses when coins are short and never goes negative', () => {
    const s = rich(109);
    const out = purchaseItem(s, 'weapon', 'ironbark_spear');
    expect(out.result).toEqual({ ok: false, reason: 'insufficient_coins' });
    expect(out.save).toBe(s);
    expect(out.save.coins).toBe(109);
  });

  it('allows spending down to exactly zero', () => {
    const out = purchaseItem(rich(110), 'weapon', 'ironbark_spear');
    expect(out.result.ok).toBe(true);
    expect(out.save.coins).toBe(0);
  });

  it('survives rapid double taps: charged once, second tap is refused', () => {
    let s = rich(500);
    const results = [];
    for (let i = 0; i < 5; i++) {
      const out = purchaseItem(s, 'character', 'ash_courier');
      results.push(out.result);
      s = out.save;
    }
    expect(results[0].ok).toBe(true);
    results.slice(1).forEach((r) => expect(r).toEqual({ ok: false, reason: 'already_owned' }));
    expect(s.coins).toBe(500 - 110);
    expect(s.inventory.characters.filter((id) => id === 'ash_courier')).toHaveLength(1);
  });

  it('refuses free items (already owned) and unknown ids', () => {
    expect(purchaseItem(rich(), 'character', 'shadow_initiate').result).toEqual({ ok: false, reason: 'already_owned' });
    expect(purchaseItem(rich(), 'weapon', 'not_a_real_item').result).toEqual({ ok: false, reason: 'unknown_item' });
  });

  it('enforces the star gate even when rich, then allows it once earned', () => {
    const s = rich(5000);
    expect(purchaseItem(s, 'character', 'lava_warlord').result).toEqual({ ok: false, reason: 'need_stars' });
    const earned = withStars(s, 42);
    expect(totalStars(earned)).toBe(42);
    expect(itemState(earned, 'character', 'lava_warlord')).toBe('buyable');
    const out = purchaseItem(earned, 'character', 'lava_warlord');
    expect(out.result).toEqual({ ok: true, price: 750 });
    expect(out.save.coins).toBe(5000 - 750);
  });

  it('does not touch level progress', () => {
    const s = withStars(rich(), 6);
    expect(purchaseItem(s, 'weapon', 'travelers_axe').save.levels).toEqual(s.levels);
  });
});

describe('equipping', () => {
  it('only equips owned items', () => {
    const s = rich();
    expect(equipItem(s, 'weapon', 'ironbark_spear')).toEqual({ save: s, ok: false });
    const bought = purchaseItem(s, 'weapon', 'ironbark_spear').save;
    const eq = equipItem(bought, 'weapon', 'ironbark_spear');
    expect(eq.ok).toBe(true);
    expect(eq.save.inventory.equippedWeapon).toBe('ironbark_spear');
    expect(itemState(eq.save, 'weapon', 'ironbark_spear')).toBe('equipped');
    expect(itemState(eq.save, 'weapon', 'initiate_katana')).toBe('owned');
  });
  it('switching equipment keeps everything owned', () => {
    const s = purchaseItem(rich(), 'weapon', 'ironbark_spear').save;
    const eq = equipItem(s, 'weapon', 'ironbark_spear').save;
    const back = equipItem(eq, 'weapon', 'initiate_katana').save;
    expect(back.inventory.weapons).toContain('ironbark_spear');
  });
  it('rejects unknown ids', () => {
    expect(equipItem(rich(), 'character', 'ghost').ok).toBe(false);
  });
});