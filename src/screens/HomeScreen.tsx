import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { nextPlayable } from '../levels/progress';
import { playMusic } from '../audio/audio';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const LATER = ['Daily Rewards', 'Progress'];

export default function HomeScreen({ navigation }: Props) {
  const { save } = useSave();
  const next = nextPlayable(save);

  useEffect(() => {
    playMusic('menu'); // does nothing if the menu track is already playing
    return navigation.addListener('focus', () => playMusic('menu'));
  }, [navigation]);
  return (
    <View style={styles.root}>
      <Text style={styles.coins}>● {save.coins}</Text>
      <Text style={styles.title}>SHADOW KILLER</Text>
      <Pressable
        style={styles.play}
        onPress={() => navigation.navigate('Arena', { mode: 'level', world: next.world, level: next.level })}
      >
        <Text style={styles.playTxt}>PLAY</Text>
        <Text style={styles.sub}>World {next.world} · Level {next.level}</Text>
      </Pressable>
      <View style={styles.row}>
        <Pressable style={styles.secondary} onPress={() => navigation.navigate('Worlds')}>
          <Text style={styles.smallTxt}>WORLDS</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => navigation.navigate('Characters')}>
          <Text style={styles.smallTxt}>CHARACTERS</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => navigation.navigate('Weapons')}>
          <Text style={styles.smallTxt}>WEAPONS</Text>
        </Pressable>
        <Pressable style={styles.tutorial} onPress={() => navigation.navigate('Arena', { mode: 'tutorial' })}>
          <Text style={styles.smallTxt}>TUTORIAL</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.smallTxt}>SETTINGS</Text>
        </Pressable>        
      </View>
      <View style={styles.row}>
        {LATER.map((label) => (
          <View key={label} style={styles.disabled}>
            <Text style={styles.disabledTxt}>{label}</Text>
            <Text style={styles.soon}>coming soon</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a14', alignItems: 'center', justifyContent: 'center', gap: 14 },
  coins: { position: 'absolute', top: 12, right: 20, color: '#ffd24a', fontWeight: '800', fontSize: 18 },
  title: { color: '#e8e8f5', fontSize: 36, fontWeight: '900', letterSpacing: 6 },
  play: { backgroundColor: '#7a2cff', paddingHorizontal: 64, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  playTxt: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 4 },
  smallTxt: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  sub: { color: '#d9c8ff', fontSize: 11, letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 700 },
  secondary: { backgroundColor: '#4b2fa8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  tutorial: { backgroundColor: '#2c5fff', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  disabled: { backgroundColor: '#1a1a2a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, opacity: 0.6 },
  disabledTxt: { color: '#aaa', fontWeight: '700' },
  soon: { color: '#666', fontSize: 10, textAlign: 'center' },
});