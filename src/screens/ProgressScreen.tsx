import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { AchievementTier, rewardOf } from '../achievements/catalog';
import { claimableCount, isClaimed, metricValue, sortedAchievements } from '../achievements/progress';
import { Icon } from '../ui/Icon';
import { MenuButton } from '../ui/MenuButton';
import { Panel } from '../ui/Panel';
import { COLORS } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

const TIER_COLOR: Record<AchievementTier, string> = {
  bronze: '#c98a52', silver: '#c5ccd6', gold: '#ffc94a', platinum: '#8fe3ff',
};

export default function ProgressScreen({ navigation }: Props) {
  const { save, claimAchievement } = useSave();
  const [msg, setMsg] = useState('');
  const list = sortedAchievements(save);

  const tiles: [string, string][] = [
    ['Levels cleared', `${metricValue(save, 'levels_cleared')}/500`],
    ['Stars', `${metricValue(save, 'stars')}/1500`],
    ['World bosses', `${metricValue(save, 'world_bosses')}/5`],
    ['Enemies defeated', String(save.lifetime.kills)],
    ['Best combo', String(save.lifetime.maxCombo)],
    ['Skins owned', String(metricValue(save, 'skins_owned'))],
    ['Runs / wins', `${save.lifetime.runs} / ${save.lifetime.wins}`],
    ['Daily claims', String(save.daily.totalClaims)],
  ];

  const claim = (id: string, name: string) => {
    const r = claimAchievement(id);
    if (r.ok) setMsg(`"${name}" claimed: +${r.reward} ●`); // a repeated tap is refused silently
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <MenuButton label="BACK" icon="back" compact onPress={() => navigation.goBack()} />
        <View style={styles.titleRow}>
          <Icon name="star" size={18} color={COLORS.gold} />
          <Text style={styles.title}>ACHIEVEMENTS</Text>
        </View>
        <View style={styles.titleRow}>
          <Icon name="coin" size={14} color={COLORS.gold} />
          <Text style={styles.coins}>{save.coins}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.tiles}>
          {tiles.map(([label, value]) => (
            <Panel key={label} style={styles.tile}>
              <Text style={styles.tileVal}>{value}</Text>
              <Text style={styles.tileLabel}>{label}</Text>
            </Panel>
          ))}
        </View>

        <Text style={styles.section}>{claimableCount(save)} READY TO CLAIM</Text>
        {!!msg && <Text style={styles.msg}>{msg}</Text>}

        {list.map((d) => {
          const value = Math.min(d.target, metricValue(save, d.metric));
          const claimed = isClaimed(save, d.id);
          const reached = value >= d.target;
          return (
            <Panel key={d.id} style={[styles.rowCard, claimed && styles.rowDone]}>
              <View style={[styles.tier, { backgroundColor: TIER_COLOR[d.tier] }]}>
                <Text style={styles.tierTxt}>{d.tier[0].toUpperCase()}</Text>
              </View>
              <View style={styles.mid}>
                <Text style={styles.name}>{d.name}</Text>
                <Text style={styles.desc}>{d.desc}</Text>
                <View style={styles.bar}>
                  <View style={[styles.fill, { width: `${(value / d.target) * 100}%`, backgroundColor: TIER_COLOR[d.tier] }]} />
                </View>
                <Text style={styles.prog}>{value}/{d.target}</Text>
              </View>
              <View style={styles.right}>
                {claimed ? (
                  <Text style={styles.done}>CLAIMED ✓</Text>
                ) : reached ? (
                  <MenuButton label={`CLAIM ● ${rewardOf(d)}`} variant="primary" compact onPress={() => claim(d.id, d.name)} />
                ) : (
                  <Text style={styles.reward}>● {rewardOf(d)}</Text>
                )}
              </View>
            </Panel>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 18, letterSpacing: 4 },
  coins: { color: COLORS.gold, fontWeight: '800' },
  body: { padding: 14, gap: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { paddingVertical: 8, paddingHorizontal: 14, minWidth: 112, alignItems: 'center' },
  tileVal: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  tileLabel: { color: COLORS.dim, fontSize: 10, fontWeight: '700' },
  section: { color: COLORS.gold, fontWeight: '800', letterSpacing: 2, marginTop: 6 },
  msg: { color: '#9fe8a8', fontWeight: '800' },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowDone: { opacity: 0.55 },
  tier: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  tierTxt: { color: '#1b1206', fontWeight: '900', fontSize: 13 },
  mid: { flex: 1, gap: 2 },
  name: { color: COLORS.text, fontWeight: '900', fontSize: 13 },
  desc: { color: COLORS.dim, fontSize: 10 },
  bar: { height: 5, backgroundColor: '#25253d', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5 },
  prog: { color: '#cfd0e6', fontSize: 10, fontWeight: '700' },
  right: { minWidth: 110, alignItems: 'flex-end' },
  reward: { color: COLORS.gold, fontWeight: '800', fontSize: 12 },
  done: { color: '#4cd964', fontWeight: '800', fontSize: 11 },
});