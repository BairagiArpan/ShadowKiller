import React, { useMemo } from 'react';
import { Group, Path, Rect } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { GROUND_Y, WORLD_H, WORLD_W } from '../engine/constants';
import type { RenderFrame } from '../engine/render';
import { BACKDROPS, LayerDef, layerPath, mixHex, pickLayers } from '../levels/backdrop';
import type { WorldDef } from '../levels/worlds';

function Layer({ frame, def, path, color }: {
  frame: SharedValue<RenderFrame>; def: LayerDef; path: string; color: string;
}) {
  const t = useDerivedValue(() => [{ translateX: -(frame.value.player.x - WORLD_W / 2) * def.factor }]);
  return (
    <Group transform={t}>
      <Path path={path} color={color} />
    </Group>
  );
}

/** PLACEHOLDER backdrop: polygon silhouettes with parallax. Clipped so it never spills into the letterbox. */
export function Background({ world, layers, fog, frame }: {
  world: WorldDef; layers: number; fog: boolean; frame: SharedValue<RenderFrame>;
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
      {items.map((it, i) => <Layer key={i} frame={frame} def={it.def} path={it.path} color={it.color} />)}
      {fog && (
        <>
          <Rect x={0} y={GROUND_Y - 80} width={WORLD_W} height={80} color={world.palette.accent} opacity={0.07} />
          <Rect x={0} y={GROUND_Y - 36} width={WORLD_W} height={36} color={world.palette.accent} opacity={0.06} />
        </>
      )}
    </Group>
  );
}