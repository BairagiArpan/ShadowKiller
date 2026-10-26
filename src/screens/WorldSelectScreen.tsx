import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { clearedInWorld, starsInWorld } from '../persistence/saveData';
import { isWorldUnlocked, worldLockReason } from '../levels/progress';
import { WORLDS } from '../levels/worlds';

type Props = NativeStackScreenProps<RootStackParamList, 'Worlds'>;

export default function WorldSelectScreen({ navigation }: Props) {
  const { save } = useSave();
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>◀ BACK</Text></Pressable>
        <Text style={styles.title}>WORLDS</Text>
        <Text style={styles.coins}>● {save.coins}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {WORLDS.map((w) => {
          const unlocked = isWorldUnlocked(save, w.index);
          const reason = worldLockReason(save, w.index);
          return (
            <Pressable
              key={w.id}
              disabled={!unlocked}
              onPress={() => navigation.navigate('Levels', { world: w.index })}
              style={[styles.card, { backgroundColor: w.palette.sky, borderColor: unlocked ? w.palette.accent : '#333' }]}
            >
              <View style={[styles.moon, { backgroundColor: w.palette.moon, opacity: unlocked ? 0.9 : 0.25 }]} />
              <Text style={[styles.name, { color: unlocked ? '#fff' : '#777' }]}>{w.index}. {w.name}</Text>
              <Text style={styles.blurb}>{w.blurb}</Text>
              {unlocked ? (
                <Text style={[styles.stat, { color: w.palette.accent }]}>
                  {clearedInWorld(save, w.index)}/100 cleared · ★ {starsInWorld(save, w.index)}/300
                </Text>
              ) : (
                <Text style={styles.lock}>🔒 {reason}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a14', paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  back: { color: '#bfa3ff', fontWeight: '800' },
  title: { color: '#fff', fontWeight: '900', fontSize: 22, letterSpacing: 5 },
  coins: { color: '#ffd24a', fontWeight: '800', fontSize: 16 },
  row: { padding: 20, gap: 14, alignItems: 'center' },
  card: { width: 210, height: 220, borderRadius: 12, borderWidth: 2, padding: 14, justifyContent: 'flex-end', gap: 6 },
  moon: { position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 22 },
  name: { fontWeight: '900', fontSize: 16 },
  blurb: { color: '#aab', fontSize: 11 },
  stat: { fontWeight: '700', fontSize: 11 },
  lock: { color: '#c77', fontSize: 11, fontWeight: '700' },
});