import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { valueFromX } from './controlsLogic';
import { COLORS } from './theme';

/** Drag to set 0..1. The value is saved once, when the finger lifts. */
export function Slider({ value, onCommit, width = 190 }: {
  value: number; onCommit: (v: number) => void; width?: number;
}) {
  const [v, setV] = useState(value);
  const latest = useRef(value);
  const commit = useRef(onCommit);
  commit.current = onCommit;

  useEffect(() => { setV(value); latest.current = value; }, [value]);

  const set = (x: number) => {
    const n = valueFromX(x, width);
    latest.current = n;
    setV(n);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => set(e.nativeEvent.locationX),
    onPanResponderMove: (e) => set(e.nativeEvent.locationX),
    onPanResponderRelease: () => commit.current(latest.current),
    onPanResponderTerminate: () => commit.current(latest.current),
  })).current;

  return (
    <View style={styles.wrap}>
      <View {...pan.panHandlers} style={{ width, height: 32, justifyContent: 'center' }}>
        <View pointerEvents="none" style={styles.track} />
        <View pointerEvents="none" style={[styles.fill, { width: v * width }]} />
        <View pointerEvents="none" style={[styles.thumb, { left: v * width - 9 }]} />
      </View>
      <Text style={styles.pct}>{Math.round(v * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: '#2a2a3d' },
  fill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },
  thumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.goldLight, borderWidth: 2, borderColor: COLORS.gold },
  pct: { color: COLORS.text, fontWeight: '800', fontSize: 12, width: 40 },
});