import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { BRANCHES, Branch, SKILLS } from '../skills/catalog';
import { availablePoints } from '../skills/progress';
import { levelProgress } from '../skills/xp';
import { MenuButton } from '../ui/MenuButton';
import { Panel } from '../ui/Panel';
import { COLORS } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Skills'>;

const REASON = {
  unknown: 'That skill does not exist.',
  max_rank: 'Already at the highest rank.',
  no_points: 'No skill points left. Win levels to earn XP.',
} as const;

export default function SkillsScreen({ navigation }: Props) {
  const { save, rankUpSkill, resetSkills } = useSave();
  const [branch, setBranch] = useState<Branch>('offense');
  const [msg, setMsg] = useState('');
  const hero = save.hero;
  const lp = levelProgress(hero.xp);
  const pts = availablePoints(hero);

  const up = (id: string, name: string) => {
    const r = rankUpSkill(id);
    setMsg(r.ok ? `${name} is now rank ${r.rank}.` : REASON[r.reason]);
  };
  const reset = () =>
    Alert.alert('Reset all skills?', 'Every point comes back. This is free.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => setMsg(resetSkills() ? 'Skills reset. All points returned.' : 'Nothing to reset.') },
    ]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <MenuButton label="BACK" icon="back" compact onPress={() => navigation.goBack()} />
        <Text style={styles.title}>SKILLS</Text>
        <MenuButton label="RESET" compact onPress={reset} />
      </View>

      <Panel style={styles.hero}>
        <Text style={styles.level}>LEVEL {lp.level}</Text>
        <View style={styles.xpCol}>
          <View style={styles.bar}><View style={[styles.fill, { width: `${lp.fraction * 100}%` }]} /></View>
          <Text style={styles.xpTxt}>{lp.need > 0 ? `${lp.into} / ${lp.need} XP` : 'MAX LEVEL'} · total {hero.xp} XP</Text>
        </View>
        <Text style={[styles.points, pts > 0 && styles.pointsOn]}>{pts} POINT{pts === 1 ? '' : 'S'}</Text>
      </Panel>

      <View style={styles.body}>
        <View style={styles.tabs}>
          {BRANCHES.map((b) => (
            <MenuButton key={b.id} label={b.label} compact variant={branch === b.id ? 'primary' : 'default'}
              onPress={() => { setBranch(b.id); setMsg(''); }} />
          ))}
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
          {SKILLS.filter((s) => s.branch === branch).map((s) => {
            const rank = hero.ranks[s.id] ?? 0;
            const maxed = rank >= s.maxRank;
            return (
              <Panel key={s.id} style={styles.skill}>
                <View style={styles.skillMid}>
                  <Text style={styles.name}>{s.name}</Text>
                  <Text style={styles.pips}>{'●'.repeat(rank)}<Text style={styles.pipOff}>{'●'.repeat(s.maxRank - rank)}</Text></Text>
                  <Text style={styles.now}>{rank > 0 ? s.text(rank) : 'No bonus yet'}</Text>
                  {!maxed && <Text style={styles.next}>Next: {s.text(rank + 1)}</Text>}
                </View>
                {maxed
                  ? <Text style={styles.max}>MAX</Text>
                  : <MenuButton label="+ 1 POINT" compact variant={pts > 0 ? 'primary' : 'default'} onPress={() => up(s.id, s.name)} />}
              </Panel>
            );
          })}
          {!!msg && <Text style={styles.msg}>{msg}</Text>}
          <Text style={styles.note}>
            Skills are earned with XP from winning levels and can never be bought. Bonuses are small by design.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 20, letterSpacing: 6 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginTop: 8, paddingVertical: 8 },
  level: { color: COLORS.gold, fontWeight: '900', fontSize: 16, letterSpacing: 3 },
  xpCol: { flex: 1, gap: 3 },
  bar: { height: 8, backgroundColor: '#25253d', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: COLORS.gold },
  xpTxt: { color: COLORS.dim, fontSize: 10, fontWeight: '700' },
  points: { color: COLORS.dim, fontWeight: '900', fontSize: 14 },
  pointsOn: { color: COLORS.goldLight },
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  tabs: { width: 120, gap: 6 },
  list: { flex: 1 },
  listInner: { gap: 8, paddingBottom: 16 },
  skill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  skillMid: { flex: 1, gap: 2 },
  name: { color: COLORS.text, fontWeight: '900', fontSize: 14 },
  pips: { color: COLORS.gold, fontSize: 12, letterSpacing: 2 },
  pipOff: { color: '#3a3a4d' },
  now: { color: COLORS.goldLight, fontSize: 11, fontWeight: '700' },
  next: { color: COLORS.dim, fontSize: 10 },
  max: { color: '#4cd964', fontWeight: '900' },
  msg: { color: '#9fe8a8', fontWeight: '800' },
  note: { color: COLORS.dim, fontSize: 10 },
});