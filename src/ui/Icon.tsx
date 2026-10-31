import React from 'react';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { ICONS, IconName } from './iconData';

/** A small vector icon, drawn in `color`. Use a few per screen, not hundreds. */
export function Icon({ name, size = 18, color = '#ffffff' }: { name: IconName; size?: number; color?: string }) {
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: size / 24 }]}>
        {ICONS[name].map((p, i) => (
          <Path
            key={i}
            path={p.d}
            color={color}
            style={p.stroke ? 'stroke' : 'fill'}
            strokeWidth={2.4}
            strokeJoin="round"
            strokeCap="round"
          />
        ))}
      </Group>
    </Canvas>
  );
}