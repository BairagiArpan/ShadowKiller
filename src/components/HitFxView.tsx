import React from 'react';
import { Circle, Group, Rect } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import type { RenderFrame } from '../engine/render';
import type { HitFxStyle } from '../cosmetics/types';

const SPARKS = 8;
const SPARK_IDX = Array.from({ length: SPARKS }, (_, i) => i);

type Fx = {
  frame: SharedValue<RenderFrame>;
  color: string;
};

function Spark({
  frame,
  color,
  i,
  style,
}: Fx & {
  i: number;
  style: HitFxStyle;
}) {
  const angle =
    (i / SPARKS) * Math.PI * 2 +
    (style === 'frost' ? Math.PI / 6 : 0);

  const t = useDerivedValue(() => {
    const fx = frame.value.fx;
    const ease = 1 - (1 - fx.k) * (1 - fx.k);

    const distance = (style === 'frost' ? 30 : 42) * ease;
    const rise = style === 'ember' ? -fx.k * 28 : 0;

    return [
      {
        translateX: fx.x + Math.cos(angle) * distance,
      },
      {
        translateY: fx.y + Math.sin(angle) * distance + rise,
      },
      {
        rotate: angle,
      },
    ];
  });

  const opacity = useDerivedValue(
    () => frame.value.fx.on * (1 - frame.value.fx.k),
  );

  const size =
    style === 'frost' ? 7 :
    style === 'ember' ? 5 : 11;

  return (
    <Group transform={t} opacity={opacity}>
      <Rect
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={style === 'spark' ? 3 : size}
        color={color}
      />
      <Circle
        cx={0}
        cy={0}
        r={2}
        color="#ffffff"
        opacity={0.7}
      />
    </Group>
  );
}

function Ring({ frame, color }: Fx) {
  const cx = useDerivedValue(() => frame.value.fx.x);
  const cy = useDerivedValue(() => frame.value.fx.y);

  const radius = useDerivedValue(
    () => 6 + frame.value.fx.k * 42,
  );

  const innerRadius = useDerivedValue(
    () => 3 + frame.value.fx.k * 25,
  );

  const opacity = useDerivedValue(
    () => frame.value.fx.on * (1 - frame.value.fx.k),
  );

  return (
    <>
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        color={color}
        style="stroke"
        strokeWidth={3}
        opacity={opacity}
      />

      <Circle
        cx={cx}
        cy={cy}
        r={innerRadius}
        color="#ffffff"
        style="stroke"
        strokeWidth={1.5}
        opacity={opacity}
      />

      <Circle
        cx={cx}
        cy={cy}
        r={4}
        color={color}
        opacity={opacity}
      />
    </>
  );
}

function Slash({ frame, color }: Fx) {
  const makeTransform = (angle: number) =>
    useDerivedValue(() => [
      { translateX: frame.value.fx.x },
      { translateY: frame.value.fx.y },
      { rotate: angle },
      { scaleX: 0.3 + frame.value.fx.k },
    ]);

  const first = makeTransform(-0.65);
  const second = makeTransform(0.65);

  const opacity = useDerivedValue(
    () => frame.value.fx.on * (1 - frame.value.fx.k),
  );

  return (
    <>
      <Group transform={first} opacity={opacity}>
        <Rect
          x={-34}
          y={-2}
          width={68}
          height={4}
          color={color}
        />
        <Rect
          x={-28}
          y={-0.5}
          width={56}
          height={1}
          color="#ffffff"
          opacity={0.8}
        />
      </Group>

      <Group transform={second} opacity={opacity}>
        <Rect
          x={-28}
          y={-1.5}
          width={56}
          height={3}
          color={color}
        />
      </Group>
    </>
  );
}

function EmberCore({ frame, color }: Fx) {
  const cx = useDerivedValue(() => frame.value.fx.x);
  const cy = useDerivedValue(() => frame.value.fx.y);

  const radius = useDerivedValue(
    () => 5 + frame.value.fx.k * 12,
  );

  const opacity = useDerivedValue(
    () => frame.value.fx.on * (1 - frame.value.fx.k) * 0.35,
  );

  return (
    <Circle
      cx={cx}
      cy={cy}
      r={radius} // java.ioexception  failed to download remote update
      color={color}
      opacity={opacity}
    />
  );
}

/** Cosmetic-only effects. The engine's fx event remains unchanged. */
export function HitFxView({
  frame,
  style,
  color,
}: {
  frame: SharedValue<RenderFrame>;
  style: HitFxStyle;
  color: string;
}) {
  return (
    <>
      {style === 'ring' && (
        <Ring frame={frame} color={color} />
      )}

      {style === 'slash' && (
        <Slash frame={frame} color={color} />
      )}

      {style === 'ember' && (
        <EmberCore frame={frame} color={color} />
      )}

      {(style === 'spark' ||
        style === 'ember' ||
        style === 'frost') &&
        SPARK_IDX.map((i) => (
          <Spark
            key={i}
            frame={frame}
            color={color}
            i={i}
            style={style}
          />
        ))}
    </>
  );
}