import React from 'react';
import { Circle, Group, Rect } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import type { RenderFrame } from '../engine/render';
import type { HitFxStyle } from '../cosmetics/types';

const SPARKS = 6;
const SPARK_IDX = Array.from({ length: SPARKS }, (_, i) => i);

type Fx = { frame: SharedValue<RenderFrame>; color: string };

function Spark({ frame, color, i, style }: Fx & { i: number; style: HitFxStyle }) {
  const angle = (i / SPARKS) * Math.PI * 2 + (style === 'frost' ? Math.PI / 6 : 0);
  const t = useDerivedValue(() => {
    const fx = frame.value.fx;
    const ease = 1 - (1 - fx.k) * (1 - fx.k);
    const dist = (style === 'frost' ? 26 : 34) * ease;
    const rise = style === 'ember' ? -fx.k * 22 : 0; // embers drift upward
    return [
      { translateX: fx.x + Math.cos(angle) * dist },
      { translateY: fx.y + Math.sin(angle) * dist + rise },
      { rotate: angle },
    ];
  });
  const op = useDerivedValue(() => frame.value.fx.on * (1 - frame.value.fx.k));
  const w = style === 'frost' ? 6 : style === 'ember' ? 4 : 10;
  const h = style === 'frost' ? 6 : style === 'ember' ? 4 : 3;
  return (
    <Group transform={t} opacity={op}>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} color={color} />
    </Group>
  );
}

function Ring({ frame, color }: Fx) {
  const cx = useDerivedValue(() => frame.value.fx.x);
  const cy = useDerivedValue(() => frame.value.fx.y);
  const r = useDerivedValue(() => 6 + frame.value.fx.k * 34);
  const op = useDerivedValue(() => frame.value.fx.on * (1 - frame.value.fx.k));
  return <Circle cx={cx} cy={cy} r={r} color={color} style="stroke" strokeWidth={3} opacity={op} />;
}

function Cross({ frame, color }: Fx) {
  const make = (angle: number) => useDerivedValue(() => [
    { translateX: frame.value.fx.x },
    { translateY: frame.value.fx.y },
    { rotate: angle },
    { scaleX: 0.3 + frame.value.fx.k },
  ]);
  const t1 = make(0.7);
  const t2 = make(-0.7);
  const op = useDerivedValue(() => frame.value.fx.on * (1 - frame.value.fx.k));
  return (
    <>
      <Group transform={t1} opacity={op}><Rect x={-30} y={-1.5} width={60} height={3} color={color} /></Group>
      <Group transform={t2} opacity={op}><Rect x={-30} y={-1.5} width={60} height={3} color={color} /></Group>
    </>
  );
}

/** Weapon-specific hit effect, driven by the engine's single `fx` event. Cosmetic only. */
export function HitFxView({ frame, style, color }: { frame: SharedValue<RenderFrame>; style: HitFxStyle; color: string }) {
  return (
    <>
      {style === 'ring' && <Ring frame={frame} color={color} />}
      {style === 'slash' && <Cross frame={frame} color={color} />}
      {(style === 'spark' || style === 'ember' || style === 'frost') &&
        SPARK_IDX.map((i) => <Spark key={i} frame={frame} color={color} i={i} style={style} />)}
    </>
  );
}