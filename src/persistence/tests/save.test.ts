jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { equipItem, purchaseItem } from '../../economy/shop';
import { levelId } from '../../levels/common';
import { defaultSave, sanitizeSave } from '../saveData';
import { loadSave, persistSave } from '../storage';
import { it, describe, expect, jest, beforeEach } from '@jest/globals';


describe('migration and sanitising', () => {
  it('upgrades a Phase 5 save: keeps progress and coins, adds the free items', () => {
    const old = { version: 1, coins: 77, levels: { [levelId(1, 1)]: { completed: true, stars: 2, bestScore: 10, challengeClears: 0 } } };
    const s = sanitizeSave(old);
    expect(s.version).toBe(4);
    expect(s.coins).toBe(77);
    expect(s.levels[levelId(1, 1)].stars).toBe(2);
    expect(s.inventory).toEqual(defaultSave().inventory);
  });

  it('never lets free items disappear', () => {
    const s = sanitizeSave({ inventory: { characters: [], weapons: [] } });
    expect(s.inventory.characters).toEqual(defaultSave().inventory.characters);
    expect(s.inventory.weapons).toEqual(defaultSave().inventory.weapons);
  });

  it('falls back to defaults when the equipped item is not owned', () => {
    const s = sanitizeSave({ inventory: { characters: [], weapons: [], equippedCharacter: 'lava_warlord', equippedWeapon: 'ghost' } });
    expect(s.inventory.equippedCharacter).toBe(defaultSave().inventory.equippedCharacter);
    expect(s.inventory.equippedWeapon).toBe(defaultSave().inventory.equippedWeapon);
  });

  it('keeps well-formed unknown ids (no accidental purchase loss) and drops malformed ones', () => {
    const s = sanitizeSave({ inventory: { characters: ['future_skin', 'BAD ID!', 42, null], weapons: [] } });
    expect(s.inventory.characters).toContain('future_skin');
    expect(s.inventory.characters).not.toContain('BAD ID!');
    expect(s.inventory.characters).toHaveLength(defaultSave().inventory.characters.length + 1);
  });

  it('removes duplicates', () => {
    const s = sanitizeSave({ inventory: { characters: ['ash_courier', 'ash_courier'], weapons: [] } });
    expect(s.inventory.characters.filter((id) => id === 'ash_courier')).toHaveLength(1);
  });
});

describe('purchases survive a restart', () => {
  it('JSON round trip keeps ownership, equipment and coins', () => {
    let s = { ...defaultSave(), coins: 1000 };
    s = purchaseItem(s, 'character', 'ash_courier').save;
    s = purchaseItem(s, 'weapon', 'ironbark_spear').save;
    s = equipItem(s, 'character', 'ash_courier').save;
    s = equipItem(s, 'weapon', 'ironbark_spear').save;
    const reloaded = sanitizeSave(JSON.parse(JSON.stringify(s)));
    expect(reloaded).toEqual(s);
    expect(reloaded.inventory.equippedCharacter).toBe('ash_courier');
    expect(reloaded.coins).toBe(1000 - 220);
  });
});

describe('storage', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('persists and reloads a save through AsyncStorage', async () => {
    const s = purchaseItem({ ...defaultSave(), coins: 500 }, 'weapon', 'ironbark_spear').save;
    await persistSave(s);
    expect(await loadSave()).toEqual(s);
  });

  it('applies overlapping writes in order (last write wins)', async () => {
    const a = { ...defaultSave(), coins: 1 };
    const b = { ...defaultSave(), coins: 2 };
    persistSave(a);
    await persistSave(b);
    expect((await loadSave()).coins).toBe(2);
  });

  it('survives corrupt data and keeps a copy for debugging', async () => {
    await AsyncStorage.setItem('shadowkiller.save.v1', '{not json');
    expect(await loadSave()).toEqual(defaultSave());
    expect(await AsyncStorage.getItem('shadowkiller.save.v1.corrupt')).toBe('{not json');
  });
});