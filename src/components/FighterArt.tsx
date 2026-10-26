import React from 'react';
import { Circle, Group, Rect } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { FIGHTER_H, FIGHTER_W } from '../engine/constants';
import type { CharacterFeature, CharacterVisual, WeaponVisual } from '../cosmetics/types';

type ColorProp = string | SharedValue<string>;

/**
 * PLACEHOLDER ART: layered shapes in local coordinates (origin = feet, +x = facing).
 * Purely visual. Extras like capes can poke slightly outside the hitbox, which never changes.
 */
export function CharacterArt({ look, color }: { look: CharacterVisual; color: ColorProp }) {
  const W = FIGHTER_W * look.widthScale;
  const bodyH = FIGHTER_H * 0.78 * look.heightScale;
  const headR = FIGHTER_H * 0.12 * look.headScale;
  const headY = -bodyH - headR * 0.83;
  const has = (f: CharacterFeature) => look.features.includes(f);

  return (
    <>
      {has('cape') && <Rect x={-W / 2 - 12} y={-bodyH * 0.95} width={16} height={bodyH * 0.9} color={look.accent} opacity={0.9} />}
      {has('tail') && <Rect x={-W / 2 - 18} y={-bodyH * 0.3} width={20} height={5} color={look.accent} />}
      {has('scarf') && <Rect x={-W / 2 - 16} y={-bodyH - 2} width={24} height={6} color={look.trim} />}
      {has('spikes') && [0, 1, 2].map((i) => (
        <Rect key={i} x={-W / 2 + 3 + i * 10} y={-bodyH - 9} width={4} height={10} color={look.accent} />
      ))}

      <Rect x={-W / 2} y={-bodyH} width={W} height={bodyH} color={color} />
      <Rect x={-W / 2} y={-bodyH} width={W} height={bodyH} color={look.trim} style="stroke" strokeWidth={1.5} opacity={0.7} />
      <Rect x={-W / 2} y={-bodyH * 0.45} width={W} height={4} color={look.accent} />

      {has('pauldrons') && (
        <>
          <Rect x={-W / 2 - 6} y={-bodyH - 1} width={13} height={11} color={look.accent} />
          <Rect x={W / 2 - 7} y={-bodyH - 1} width={13} height={11} color={look.accent} />
        </>
      )}

      {has('hood') && <Circle cx={0} cy={headY} r={headR * 1.3} color={look.accent} />}
      {has('halo') && <Circle cx={0} cy={headY - headR * 1.9} r={headR * 0.9} color={look.accent} style="stroke" strokeWidth={3} />}
      <Circle cx={0} cy={headY} r={headR} color={color} />
      {has('hat') && (
        <>
          <Rect x={-headR * 1.9} y={headY - headR - 1} width={headR * 3.8} height={4} color={look.accent} />
          <Rect x={-headR * 0.7} y={headY - headR - 9} width={headR * 1.4} height={9} color={look.accent} />
        </>
      )}
      {has('mask') && <Rect x={-headR * 0.9} y={headY} width={headR * 1.8} height={headR * 0.9} color={look.accent} />}
      {has('horns') && [-1, 1].map((s) => (
        <Group key={s} transform={[{ translateX: s * headR * 0.7 }, { translateY: headY - headR * 0.8 }, { rotate: s * 0.5 }]}>
          <Rect x={-2} y={-14} width={4} height={16} color={look.trim} />
        </Group>
      ))}
      <Rect x={headR * 0.15} y={headY - 2} width={headR * 0.8} height={3} color={look.eye} />
    </>
  );
}

/** Weapon drawn along +x from the hand (origin). `length` is drawing only; it never changes attack reach. */
export function WeaponArt({ weapon, glow = true }: { weapon: WeaponVisual; glow?: boolean }) {
  const L = weapon.length;
  const { blade, handle } = weapon;
  const weaponGlow = weapon.glow;
  const halo = glow ? <Rect x={-4} y={-7} width={L + 8} height={14} color={weaponGlow} opacity={0.28} /> : null;

  switch (weapon.shape) {
    case 'katana':
      return (<>{halo}
        <Rect x={-10} y={-2.5} width={12} height={5} color={handle} />
        <Rect x={2} y={-6} width={3} height={12} color={weaponGlow} />
        <Rect x={5} y={-2} width={L - 5} height={4} color={blade} /></>);
    case 'greatsword':
      return (<>{halo}
        <Rect x={-12} y={-3} width={14} height={6} color={handle} />
        <Rect x={2} y={-8} width={4} height={16} color={weaponGlow} />
        <Rect x={6} y={-5} width={L - 6} height={10} color={blade} /></>);
    case 'dual':
      return (<>{halo}
        <Rect x={-6} y={-3} width={10} height={6} color={handle} />
        <Rect x={4} y={-7} width={L * 0.85} height={3} color={blade} />
        <Rect x={4} y={4} width={L * 0.85} height={3} color={blade} /></>);
    case 'daggers':
      return (<>
        <Rect x={-6} y={-3} width={10} height={6} color={handle} />
        <Rect x={4} y={-8} width={L * 0.6} height={3} color={blade} />
        <Rect x={4} y={5} width={L * 0.6} height={3} color={blade} />
        <Rect x={4} y={-8} width={L * 0.6} height={3} color={weaponGlow} opacity={0.35} />
        <Rect x={4} y={5} width={L * 0.6} height={3} color={weaponGlow} opacity={0.35} /></>);
    case 'spear':
      return (<>{halo}
        <Rect x={-14} y={-1.5} width={L} height={3} color={handle} />
        <Group transform={[{ translateX: L }, { rotate: Math.PI / 4 }]}>
          <Rect x={-5} y={-5} width={10} height={10} color={blade} />
        </Group></>);
    case 'scythe':
      return (<>
        <Rect x={-12} y={-2} width={L} height={4} color={handle} />
        <Rect x={L - 18} y={-26} width={7} height={28} color={blade} />
        <Rect x={L - 18} y={-26} width={7} height={28} color={weaponGlow} opacity={0.3} />
        <Group transform={[{ translateX: L - 16 }, { translateY: -26 }, { rotate: 0.6 }]}>
          <Rect x={0} y={-3} width={14} height={6} color={blade} />
        </Group></>);
    case 'chain':
      return (<>
        <Rect x={-8} y={-2} width={10} height={4} color={handle} />
        {[0, 1, 2, 3].map((i) => <Circle key={i} cx={6 + i * L * 0.17} cy={0} r={3} color={handle} />)}
        <Rect x={L * 0.7} y={-5} width={L * 0.3} height={10} color={weaponGlow} opacity={0.35} />
        <Rect x={L * 0.7} y={-4} width={L * 0.3} height={8} color={blade} /></>);
    case 'axe':
      return (<>
        <Rect x={-8} y={-2} width={L + 8} height={4} color={handle} />
        <Rect x={L - 16} y={-15} width={14} height={30} color={blade} />
        <Rect x={L - 2} y={-15} width={3} height={30} color={weaponGlow} /></>);
    case 'staff':
      return (<>
        <Rect x={-10} y={-2} width={L + 10} height={4} color={handle} />
        <Circle cx={L + 4} cy={0} r={11} color={weaponGlow} opacity={0.35} />
        <Circle cx={L + 4} cy={0} r={6} color={blade} /></>);
    default:
      return null;
  }
}