import React, { useMemo } from 'react';
import { Circle, Group, Path, Rect } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { GROUND_Y, WORLD_H, WORLD_W } from '../engine/constants';
import type { RenderFrame } from '../engine/render';
import {
  BACKDROPS,
  LayerDef,
  layerPath,
  mixHex,
  pickLayers,
} from '../levels/backdrop';
import type { WorldDef } from '../levels/worlds';

function Layer({
  frame,
  def,
  path,
  color,
}: {
  frame: SharedValue<RenderFrame>;
  def: LayerDef;
  path: string;
  color: string;
}) {
  const t = useDerivedValue(() => [
    { translateX: -(frame.value.player.x - WORLD_W / 2) * def.factor },
  ]);

  return (
    <Group transform={t}>
      <Path path={path} color={color} />
    </Group>
  );
}

const STARS = [
  [45, 48, 1.5], [110, 92, 1], [185, 38, 1.5],
  [265, 76, 1], [350, 34, 1.5], [430, 88, 1],
  [510, 42, 1.5], [590, 78, 1], [690, 36, 1.5],
  [750, 94, 1],
];

export function Background({
  world,
  layers,
  fog,
  frame,
}: {
  world: WorldDef;
  layers: number;
  fog: boolean;
  frame: SharedValue<RenderFrame>;
}) {
  const items = useMemo(() => {
    const defs = pickLayers(BACKDROPS[world.index], layers);

    return defs.map((d, i) => ({
      def: d,
      path: layerPath(d, world.index * 31 + i),
      color: mixHex(world.palette.sky, world.palette.accent, d.tint),
    }));
  }, [world, layers]);

  return (
    <Group clip={{ x: 0, y: 0, width: WORLD_W, height: WORLD_H }}>
      {/* Distant atmosphere */}
      <Rect
        x={0}
        y={0}
        width={WORLD_W}
        height={GROUND_Y}
        color={world.palette.accent}
        opacity={0.045}
      />

      {/* Stars */}
      {STARS.map(([x, y, r], i) => (
        <Circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          color="#ffffff"
          opacity={0.45}
        />
      ))}

      {/* Distant moon / light halo */}
      <Circle
        cx={650}
        cy={70}
        r={58}
        color={world.palette.accent}
        opacity={0.07}
      />
      <Circle
        cx={650}
        cy={70}
        r={46}
        color={world.palette.moon}
        opacity={0.12}
      />
      <Circle
        cx={650}
        cy={70}
        r={40}
        color={world.palette.moon}
        opacity={0.12}
      />

      {/* Parallax environment */}
      {items.map((it, i) => (
        <Layer
          key={i}
          frame={frame}
          def={it.def}
          path={it.path}
          color={it.color}
        />
      ))}

      {/* Horizon light */}
      <Rect
        x={0}
        y={GROUND_Y - 65}
        width={WORLD_W}
        height={65}
        color={world.palette.accent}
        opacity={0.045}
      />
      <Rect
        x={0}
        y={GROUND_Y - 8}
        width={WORLD_W}
        height={8}
        color={world.palette.accent}
        opacity={0.12}
      />

      {/* Fog layers */}
      {fog && (
        <>
          <Rect
            x={0}
            y={GROUND_Y - 80}
            width={WORLD_W}
            height={80}
            color={world.palette.accent}
            opacity={0.07}
          />
          <Rect
            x={0}
            y={GROUND_Y - 36}
            width={WORLD_W}
            height={36}
            color={world.palette.moon}
            opacity={0.06}
          />
        </>
      )}
    </Group>
  );
}