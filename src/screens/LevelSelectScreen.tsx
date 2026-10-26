import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { starsInWorld } from '../persistence/saveData';
import { ENEMY_DEFS } from '../engine/enemies';
import { LEVELS_PER_WORLD, levelId, tierLabel } from '../levels/common';
import { getWorldLevels } from '../levels';
import { isLevelUnlocked, nextPlayable } from '../levels/progress';
import { REWARDS } from '../economy/economy.config';
import { WORLDS } from '../levels/worlds';

type Props = NativeStackScreenProps<RootStackParamList, 'Levels'>;

const COLS = 8;
const ROW_H = 54;
const NUMBERS = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => i + 1);
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export default function LevelSelectScreen({ navigation, route }: Props) {
  const { world } = route.params;
  const wd = WORLDS[world - 1];
  const { save } = useSave();
  const levels = useMemo(() => getWorldLevels(world), [world]);
  const next = nextPlayable(save);
  const initial = next.world === world ? next.level : 1;
  const [selected, setSelected] = useState(initial);

  const cfg = levels[selected - 1];
  const rec = save.levels[levelId(world, selected)];
  const unlocked = isLevelUnlocked(save, world, selected);
  const enemyNames = Array.from(new Set(cfg.waves.flat())).map((k) => ENEMY_DEFS[k].label).join(', ');
  const hazardNames = Array.from(new Set(cfg.hazards.map((h) => h.kind))).join(', ') || 'none';
  const enemyCount = cfg.waves.reduce((s, w) => s + w.length, 0);

  const play = (challenge: boolean) =>
    navigation.navigate('Arena', { mode: 'level', world, level: selected, challenge });

  return (
    <View style={[styles.root, { backgroundColor: wd.palette.sky }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>◀ WORLDS</Text></Pressable>
        <Text style={[styles.title, { color: wd.palette.accent }]}>{wd.name.toUpperCase()}</Text>
        <Text style={styles.coins}>★ {starsInWorld(save, world)}/300   ● {save.coins}</Text>
      </View>

      <View style={styles.body}>
        <FlatList
          style={styles.grid}
          data={NUMBERS}
          numColumns={COLS}
          keyExtractor={(n) => String(n)}
          extraData={[save, selected]}
          getItemLayout={(_, i) => ({ length: ROW_H, offset: ROW_H * i, index: i })}
          initialScrollIndex={Math.floor((initial - 1) / COLS)}
          renderItem={({ item }) => {
            const r = save.levels[levelId(world, item)];
            const open = isLevelUnlocked(save, world, item);
            return (
              <Pressable
                onPress={() => setSelected(item)}
                style={[
                  styles.cell,
                  { backgroundColor: !open ? '#15151f' : r?.completed ? wd.palette.ground : '#2a2a40' },
                  selected === item && { borderColor: wd.palette.accent, borderWidth: 2 },
                ]}
              >
                <Text style={[styles.cellNum, !open && { color: '#555' }]}>{open ? item : '🔒'}</Text>
                {r?.completed && <Text style={styles.cellStars}>{stars(r.stars)}</Text>}
              </Pressable>
            );
          }}
        />

        <View style={styles.panel}>
          <Text style={styles.pTitle}>Level {selected}</Text>
          <Text style={[styles.pTier, { color: wd.palette.accent }]}>
            {tierLabel(cfg.tier)}{cfg.worldBoss ? ' · WORLD BOSS' : cfg.miniBoss ? ' · MINI-BOSS' : ''}
          </Text>
          <Text style={styles.pLine}>{cfg.waves.length} waves · {enemyCount} enemies</Text>
          <Text style={styles.pLine}>{enemyNames}</Text>
          <Text style={styles.pLine}>Hazards: {hazardNames}</Text>
          <Text style={styles.pLine}>★ {cfg.objective.label}</Text>
          <Text style={styles.pLine}>Reward: {cfg.baseReward} ●{rec?.completed ? ' (first clear claimed)' : ''}</Text>
          {rec?.completed && <Text style={styles.pLine}>Best {rec.bestScore} · {stars(rec.stars)}</Text>}

          {unlocked ? (
            <>
              <Pressable style={[styles.btn, { backgroundColor: wd.palette.accent }]} onPress={() => play(false)}>
                <Text style={styles.btnTxt}>{rec?.completed ? 'REPLAY' : 'PLAY'}</Text>
              </Pressable>
              {rec?.completed && (
                <Pressable style={[styles.btn, styles.challenge]} onPress={() => play(true)}>
                  <Text style={styles.btnTxt}>
                    CHALLENGE {rec.challengeClears === 0 ? `+${Math.round(cfg.baseReward * REWARDS.challengeFirstMultiplier)}●` : ''}
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text style={styles.locked}>🔒 Locked. Clear the previous level first.</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6 },
  back: { color: '#bfa3ff', fontWeight: '800' },
  title: { fontWeight: '900', fontSize: 18, letterSpacing: 4 },
  coins: { color: '#ffd24a', fontWeight: '800' },
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: 12, gap: 12 },
  grid: { flex: 1 },
  cell: { width: 46, height: 46, margin: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cellNum: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cellStars: { color: '#ffd24a', fontSize: 8, letterSpacing: 1 },
  panel: { width: 240, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, padding: 12, gap: 4, marginBottom: 8 },
  pTitle: { color: '#fff', fontWeight: '900', fontSize: 18 },
  pTier: { fontWeight: '800', fontSize: 11, letterSpacing: 2 },
  pLine: { color: '#cfd0e6', fontSize: 11 },
  btn: { marginTop: 8, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  challenge: { backgroundColor: '#a8261b', marginTop: 4 },
  btnTxt: { color: '#fff', fontWeight: '800', letterSpacing: 2 },
  locked: { color: '#c77', marginTop: 8, fontWeight: '700' },
});