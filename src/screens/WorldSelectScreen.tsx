import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { clearedInWorld, starsInWorld } from '../persistence/saveData';
import { isWorldUnlocked, nextPlayable, worldLockReason } from '../levels/progress';
import { WORLDS } from '../levels/worlds';
import { MenuButton } from '../ui/MenuButton';
import { COLORS } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Worlds'>;

/** 0 to 3 stars for how much of a world's 300 stars you have. */
const worldStars = (stars: number): number => Math.min(3, Math.floor((stars / 300) * 3 + 1e-9));

export default function WorldSelectScreen({ navigation }: Props) {
  const { save } = useSave();
  const current = nextPlayable(save).world;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <MenuButton label="◀ BACK" compact onPress={() => navigation.goBack()} />
        <Text style={styles.title}>SELECT WORLD</Text>
        <Text style={styles.coins}>● {save.coins}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {WORLDS.map((w) => {
          const unlocked = isWorldUnlocked(save, w.index);
          const stars = starsInWorld(save, w.index);
          const n = worldStars(stars);
          const border = w.index === current && unlocked ? COLORS.gold : unlocked ? w.palette.accent : '#2a2a3d';
          return (
            <Pressable
              key={w.id}
              disabled={!unlocked}
              onPress={() => navigation.navigate('Levels', { world: w.index })}
              style={[styles.card, { backgroundColor: w.palette.sky, borderColor: border }]}
            >
              {/* PLACEHOLDER SCENE */}
              <View style={[styles.moon, { backgroundColor: w.palette.moon, opacity: unlocked ? 0.9 : 0.25 }]} />
              <View style={[styles.ground, { backgroundColor: w.palette.ground }]} />
              <Text style={[styles.num, { color: unlocked ? COLORS.text : '#555' }]}>{w.index}</Text>
              <Text style={[styles.name, { color: unlocked ? COLORS.text : '#777' }]}>{w.name.toUpperCase()}</Text>
              {unlocked ? (
                <>
                  <Text style={styles.stars}>{'★'.repeat(n)}<Text style={styles.starOff}>{'★'.repeat(3 - n)}</Text></Text>
                  <Text style={styles.stat}>{clearedInWorld(save, w.index)}/100 cleared · ★ {stars}/300</Text>
                </>
              ) : (
                <Text style={styles.lock}>🔒 {worldLockReason(save, w.index)}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 20, letterSpacing: 6 },
  coins: { color: COLORS.gold, fontWeight: '800', fontSize: 16, width: 90, textAlign: 'right' },
  row: { padding: 20, gap: 12, alignItems: 'center' },
  card: { width: 170, height: 230, borderRadius: 10, borderWidth: 2, padding: 12, justifyContent: 'flex-end', gap: 4, overflow: 'hidden' },
  moon: { position: 'absolute', top: 18, right: 18, width: 46, height: 46, borderRadius: 23 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, opacity: 0.8 },
  num: { fontSize: 34, fontWeight: '900' },
  name: { fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  stars: { color: COLORS.gold, fontSize: 18 },
  starOff: { color: '#3a3a4d' },
  stat: { color: COLORS.dim, fontSize: 10, fontWeight: '700' },
  lock: { color: '#c77', fontSize: 10, fontWeight: '700' },
});



