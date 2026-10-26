import { BOSS_LOOKS, ENEMY_LOOKS, ENEMY_WEAPONS } from '../enemyLook';
import { it, expect, describe } from '@jest/globals';

const sig = (v: { features: string[]; widthScale: number; heightScale: number; headScale: number }) =>
  JSON.stringify([[...v.features].sort(), v.widthScale, v.heightScale, v.headScale]);

describe('enemy silhouettes', () => {
  it('gives every enemy type and every boss a distinct silhouette', () => {
    const looks = [...Object.values(ENEMY_LOOKS), ...Object.values(BOSS_LOOKS)];
    expect(new Set(looks.map(sig)).size).toBe(looks.length);
    expect(Object.keys(BOSS_LOOKS)).toHaveLength(5);
  });
  it('keeps drawing scales within +-10% so visuals stay close to the unchanged hitboxes', () => {
    for (const v of [...Object.values(ENEMY_LOOKS), ...Object.values(BOSS_LOOKS)]) {
      for (const s of [v.widthScale, v.heightScale, v.headScale]) {
        expect(s).toBeGreaterThanOrEqual(0.9);
        expect(s).toBeLessThanOrEqual(1.1);
      }
    }
  });
  it('has a weapon look for every enemy kind, with cosmetic keys only', () => {
    const allowed = ['shape', 'length', 'blade', 'handle', 'glow', 'trail', 'hitFx', 'hitColor'];
    for (const w of Object.values(ENEMY_WEAPONS)) Object.keys(w).forEach((k) => expect(allowed).toContain(k));
    expect(Object.keys(ENEMY_WEAPONS)).toHaveLength(6);
  });
});