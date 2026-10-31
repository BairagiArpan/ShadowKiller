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
import { MenuButton } from '../ui/MenuButton';
import { Panel } from '../ui/Panel';
import { COLORS } from '../ui/theme';

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
        <MenuButton label="WORLDS" icon="back" compact onPress={() => navigation.goBack()} />
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
            const isSel = selected === item;
            return (
              <Pressable
                onPress={() => setSelected(item)}
                style={[
                  styles.cell,
                  { backgroundColor: !open ? '#12121b' : r?.completed ? wd.palette.ground : '#1d1d2e' },
                  { borderColor: isSel ? COLORS.gold : r?.stars === 3 ? '#8a6a1c' : '#2a2a3d' },
                  isSel && styles.cellSel,
                ]}
              >
                <Text style={[styles.cellNum, !open && { color: '#555' }]}>{open ? item : '🔒'}</Text>
                {r?.completed && <Text style={styles.cellStars}>{stars(r.stars)}</Text>}
              </Pressable>
            );
          }}
        />

        <Panel style={styles.panel}>
          <Text style={styles.pTitle}>Level {selected}</Text>
          <Text style={styles.pTier}>
            {tierLabel(cfg.tier)}{cfg.worldBoss ? ' · WORLD BOSS' : cfg.miniBoss ? ' · MINI-BOSS' : ''}
          </Text>
          <Text style={styles.pLine}>{cfg.waves.length} waves · {enemyCount} enemies</Text>
          <Text style={styles.pLine}>{enemyNames}</Text>
          <Text style={styles.pLine}>Hazards: {hazardNames}</Text>
          <Text style={styles.pGold}>★ {cfg.objective.label}</Text>
          <Text style={styles.pLine}>Reward: {cfg.baseReward} ●{rec?.completed ? ' (first clear claimed)' : ''}</Text>
          {rec?.completed && <Text style={styles.pLine}>Best {rec.bestScore} · {stars(rec.stars)}</Text>}

          <View style={styles.actions}>
            {unlocked ? (
              <>
                <MenuButton label={rec?.completed ? 'REPLAY' : 'PLAY'} variant="primary" icon="play" onPress={() => play(false)} />
                {rec?.completed && (
                  <MenuButton
                    label={`CHALLENGE${rec.challengeClears === 0 ? ` +${Math.round(cfg.baseReward * REWARDS.challengeFirstMultiplier)}●` : ''}`}
                    variant="danger" compact onPress={() => play(true)}
                  />
                )}
              </>
            ) : (
              <Text style={styles.locked}>🔒 Locked. Clear the previous level first.</Text>
            )}
          </View>
        </Panel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 6 },
  title: { fontWeight: '900', fontSize: 18, letterSpacing: 5 },
  coins: { color: COLORS.gold, fontWeight: '800' },
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: 12, gap: 12 },
  grid: { flex: 1 },
  cell: { width: 46, height: 46, margin: 4, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cellSel: { borderWidth: 2.5 },
  cellNum: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
  cellStars: { color: COLORS.gold, fontSize: 8, letterSpacing: 1 },
  panel: { width: 250, gap: 3, marginBottom: 8, backgroundColor: 'rgba(7,7,13,0.85)' },
  pTitle: { color: COLORS.text, fontWeight: '900', fontSize: 18 },
  pTier: { color: COLORS.gold, fontWeight: '800', fontSize: 11, letterSpacing: 2 },
  pLine: { color: '#cfd0e6', fontSize: 11 },
  pGold: { color: COLORS.goldLight, fontSize: 11, fontWeight: '700' },
  actions: { marginTop: 8, gap: 6 },
  locked: { color: '#c77', fontWeight: '700' },
});