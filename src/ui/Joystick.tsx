import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { COLORS } from './theme';

/**
 * On-screen stick. Reports dx and dy from -1 to 1 (y points down).
 * It measures movement from where the finger first lands, and snaps back to 0 on release.
 * Only this component re-renders while you drag, never the game screen.
 */
export function Joystick({ size, onChange }: { size: number; onChange: (dx: number, dy: number) => void }) {
  const R = size / 2;
  const thumb = size * 0.4;
  const max = R - thumb * 0.35;
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const cb = useRef(onChange);
  cb.current = onChange;

  const move = (gx: number, gy: number) => {
    const len = Math.hypot(gx, gy);
    const k = len > max ? max / len : 1;
    const x = gx * k;
    const y = gy * k;
    pos.setValue({ x, y });
    cb.current(x / max, y / max);
  };
  const release = () => {
    pos.setValue({ x: 0, y: 0 });
    cb.current(0, 0);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => move(0, 0),
    onPanResponderMove: (_e, g) => move(g.dx, g.dy),
    onPanResponderRelease: release,
    onPanResponderTerminate: release,
  })).current;

  return (
    <View {...pan.panHandlers} style={[styles.base, { width: size, height: size, borderRadius: R }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.thumb, { width: thumb, height: thumb, borderRadius: thumb / 2 }, { transform: pos.getTranslateTransform() }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: 'rgba(16,16,25,0.6)', borderWidth: 2, borderColor: 'rgba(245,166,35,0.5)', alignItems: 'center', justifyContent: 'center' },
  thumb: { backgroundColor: COLORS.gold, borderWidth: 2, borderColor: COLORS.goldLight },
});