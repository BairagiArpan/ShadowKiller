import { CHARACTERS, DEFAULT_CHARACTER_ID, DEFAULT_WEAPON_ID } from '../../cosmetics/catalog';
import { defaultSave, SaveData } from '../../persistence/saveData';
import { CAPS, CATEGORY_REACH, FIGHTERS, GEAR } from '../catalog';
import {
  FIGHTER_LOOKS, GEAR_WEAPON_LOOKS, fighterVisual, gearWeaponVisual, playerCharacterVisual, playerWeaponVisual,
} from '../looks';
import { buyFighter, buyGear, equipGear, gearPerks, selectFighter } from '../progress';
import { describe, expect, it } from '@jest/globals';

const rich = (): SaveData => ({ ...defaultSave(), coins: 20000 });
const wsig = (v: { shape: string; blade: string; glow: string }) => `${v.shape}:${v.blade}:${v.glow}`;

describe('looks', () => {
  it('every gear weapon and every fighter has its own distinct look', () => {
    const weapons = GEAR.filter((g) => g.slot === 'weapon').map((g) => gearWeaponVisual(g.id));
    expect(new Set(weapons.map(wsig)).size).toBe(weapons.length);
    const fighters = FIGHTERS.map((f) => fighterVisual(f.id));
    expect(new Set(fighters.map((v) => v.body)).size).toBe(fighters.length);
    expect(new Set(fighters.map((v) => [...v.features].sort().join('+'))).size).toBe(fighters.length);
  });

  it('every look entry refers to a real item and carries only cosmetic fields', () => {
    Object.keys(GEAR_WEAPON_LOOKS).forEach((id) => expect(GEAR.some((g) => g.id === id && g.slot === 'weapon')).toBe(true));
    Object.keys(FIGHTER_LOOKS).forEach((id) => expect(FIGHTERS.some((f) => f.id === id)).toBe(true));
    const allowed = ['shape', 'length', 'blade', 'handle', 'glow', 'trail', 'hitFx', 'hitColor'];
    Object.values(GEAR_WEAPON_LOOKS).forEach((v) => Object.keys(v).forEach((k) => expect(allowed).toContain(k)));
    Object.values(GEAR_WEAPON_LOOKS).forEach((v) => {
      expect(v.length).toBeGreaterThanOrEqual(28);
      expect(v.length).toBeLessThanOrEqual(56);
    });
    Object.values(FIGHTER_LOOKS).forEach((v) => [v.widthScale, v.heightScale, v.headScale].forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(0.9);
      expect(n).toBeLessThanOrEqual(1.1);
    }));
  });

  it('a new save shows the starter look; equipping gear or switching fighter changes what is shown', () => {
    const s0 = rich();
    const starter = CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER_ID)!.visual;
    expect(playerCharacterVisual(s0)).toEqual(starter);
    const s1 = selectFighter(buyFighter(s0, 'ninja').save, 'ninja').save;
    expect(playerCharacterVisual(s1)).toEqual(FIGHTER_LOOKS.ninja);
    const s2 = equipGear(buyGear(s1, 'fire_blade').save, 'fire_blade').save;
    expect(playerWeaponVisual(s2)).toEqual(GEAR_WEAPON_LOOKS.fire_blade);
  });

  it('a chosen outfit or weapon skin takes priority over the gear look', () => {
    let s = rich();
    s = selectFighter(buyFighter(s, 'samurai').save, 'samurai').save;
    s = equipGear(buyGear(s, 'dragon_spear').save, 'dragon_spear').save;
    s = { ...s, inventory: { ...s.inventory, characters: [...s.inventory.characters, 'ash_courier'], equippedCharacter: 'ash_courier' } };
    expect(playerCharacterVisual(s)).toEqual(CHARACTERS.find((c) => c.id === 'ash_courier')!.visual);
    s = { ...s, inventory: { ...s.inventory, equippedWeapon: 'rustfang_daggers' } };
    expect(playerWeaponVisual(s).shape).toBe('daggers');
    expect(s.inventory.equippedCharacter).not.toBe(DEFAULT_CHARACTER_ID);
    expect(DEFAULT_WEAPON_ID).toBe('initiate_katana');
  });
});

describe('weapon reach', () => {
  it('katana and dual blades keep normal reach, spear and scythe gain some, never past the cap', () => {
    expect(CATEGORY_REACH.katana).toBe(1);
    expect(CATEGORY_REACH.dual).toBe(1);
    expect(CATEGORY_REACH.spear).toBeGreaterThan(1);
    expect(CATEGORY_REACH.scythe).toBeGreaterThan(1);
    Object.values(CATEGORY_REACH).forEach((r) => expect(r).toBeLessThanOrEqual(CAPS.reach));
  });
  it('equipping a spear raises the combat reach; swapping back lowers it', () => {
    const s0 = rich();
    expect(gearPerks(s0).reach).toBe(1);
    const spear = equipGear(buyGear(s0, 'dragon_spear').save, 'dragon_spear').save;
    expect(gearPerks(spear).reach).toBe(1.15);
    expect(gearPerks(equipGear(spear, 'shadow_katana').save).reach).toBe(1);
    const thunder = equipGear(buyGear(s0, 'thunder_blade').save, 'thunder_blade').save;
    expect(gearPerks(thunder).reach).toBe(1);
  });
});