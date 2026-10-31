import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import type { IconName } from './iconData';
import { VARIANTS, Variant } from './theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  sub?: string;       // small second line, e.g. "World 1 · Level 4"
  badge?: string;     // small red tag, e.g. "!" or "3"
  icon?: IconName;    // drawn icon before the label
  glyph?: string;     // or one simple character
  width?: number;
  compact?: boolean;  // smaller text and padding for secondary rows
}

export function MenuButton({ label, onPress, variant = 'default', sub, badge, icon, glyph, width, compact }: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.compact,
        { backgroundColor: v.bg, borderColor: v.border, opacity: pressed ? 0.8 : 1 },
        width !== undefined && { width },
      ]}
    >
      {icon ? <Icon name={icon} size={compact ? 14 : 16} color={v.text} /> : null}
      {!icon && glyph ? <Text style={[styles.glyph, { color: v.text }]}>{glyph}</Text> : null}
      <View style={styles.mid}>
        <Text style={[styles.label, compact && styles.labelCompact, { color: v.text }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: v.text }]}>{sub}</Text> : null}
      </View>
      {badge ? <View style={styles.badge}><Text style={styles.badgeTxt}>{badge}</Text></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 6, borderWidth: 1.5 },
  compact: { paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  mid: { flex: 1, alignItems: 'flex-start' },
  glyph: { fontSize: 14, fontWeight: '900', width: 18, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  labelCompact: { fontSize: 11, letterSpacing: 1 },
  sub: { fontSize: 10, opacity: 0.85, letterSpacing: 1 },
  badge: { backgroundColor: '#e0334c', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
});