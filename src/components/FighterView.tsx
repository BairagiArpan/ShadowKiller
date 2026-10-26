import React from 'react';
import { Rect } from '@shopify/react-native-skia';
import { Group } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import {
  FIGHTER_H, FIGHTER_W, GROUND_Y, HAZARD_H, PROJECTILE_H, PROJECTILE_W,
} from '../engine/constants';
import type { RenderFrame } from '../engine/render';
import type { CharacterVisual, WeaponVisual } from '../cosmetics/types';
import { CharacterArt, WeaponArt } from './FighterArt';

interface FighterProps {
  frame: SharedValue<RenderFrame>;
  who: 'player' | number; // 'player' or enemy slot index
  look: CharacterVisual;
  weapon: WeaponVisual;
  glow?: boolean;
}

/** Pose, color, flash and slash come from the frame (per-frame); the skin itself is static. */
export function FighterView({ frame, who, look, weapon, glow = true }: FighterProps) {
  const f = useDerivedValue(() => (who === 'player' ? frame.value.player : frame.value.enemies[who]));

  const transform = useDerivedValue(() => [
    { translateX: f.value.x },
    { translateY: f.value.y },
    { scaleX: f.value.facing },
    { scaleY: f.value.squash },
    { rotate: f.value.lean },
  ]);
  const weaponTransform = useDerivedValue(() => [
    { translateX: FIGHTER_W / 2 - 6 },
    { translateY: -FIGHTER_H * 0.62 },
    { rotate: f.value.weapon },
  ]);
  const opacity = useDerivedValue(() => f.value.opacity * f.value.visible);
  const color = useDerivedValue(() => f.value.color);
  const warn = useDerivedValue(() => f.value.warn * f.value.visible);
  const slashX = useDerivedValue(() => f.value.slashX);
  const slashY = useDerivedValue(() => f.value.slashY);
  const slashW = useDerivedValue(() => f.value.slashW);
  const slashOp = useDerivedValue(() => f.value.slashOn * f.value.visible);

  return (
    <>
      <Group transform={transform} opacity={opacity}>
        <CharacterArt look={look} color={color} />
        <Rect x={-FIGHTER_W / 2} y={-FIGHTER_H * 0.78} width={FIGHTER_W} height={FIGHTER_H * 0.78}
              color="#ffd24a" opacity={warn} />
        <Group transform={weaponTransform}>
          <WeaponArt weapon={weapon} glow={glow} />
        </Group>
      </Group>
      <Rect x={slashX} y={slashY} width={slashW} height={FIGHTER_H * 0.6} color={weapon.trail} opacity={slashOp} />
    </>
  );
}

export function ProjectileView({ frame, index }: { frame: SharedValue<RenderFrame>; index: number }) {
  const x = useDerivedValue(() => frame.value.projectiles[index].x - PROJECTILE_W / 2);
  const y = useDerivedValue(() => frame.value.projectiles[index].y - PROJECTILE_H / 2);
  const on = useDerivedValue(() => frame.value.projectiles[index].on);
  return <Rect x={x} y={y} width={PROJECTILE_W} height={PROJECTILE_H} color="#7ff3ff" opacity={on} />;
}

export function HazardView({ frame, index }: { frame: SharedValue<RenderFrame>; index: number }) {
  const x = useDerivedValue(() => frame.value.hazards[index].x);
  const w = useDerivedValue(() => frame.value.hazards[index].w);
  const op = useDerivedValue(() => frame.value.hazards[index].opacity * frame.value.hazards[index].on);
  const color = useDerivedValue(() => frame.value.hazards[index].color);
  return <Rect x={x} y={GROUND_Y - HAZARD_H} width={w} height={HAZARD_H} color={color} opacity={op} />;
}