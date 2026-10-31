import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS } from './theme';

export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}


const styles = StyleSheet.create({
  panel: { backgroundColor: COLORS.panel, borderColor: COLORS.panelBorder, borderWidth: 1.5, borderRadius: 10, padding: 14 },
});
