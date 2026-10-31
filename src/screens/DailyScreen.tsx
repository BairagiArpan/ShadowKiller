import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { DAILY } from '../economy/economy.config';
import { currentStreak, dailyStatus, formatDuration, nextDay } from '../economy/daily';
import { MenuButton } from '../ui/MenuButton';
import { Panel } from '../ui/Panel';
import { COLORS } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Daily'>;

const REASON = {
  wait: 'Not ready yet.',
  clock_back: 'Your device clock moved backwards.',
  invalid_reward: 'This reward is unavailable right now.',
} as const;

export default function DailyScreen({ navigation }: Props) {
  const { save, claimDaily, resetClockLock } = useSave();
  const [now, setNow] = useState(() => Date.now());
  const [msg, setMsg] = useState('');
  const lock = useRef(false); // stops a second tap from overwriting the success message

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const status = dailyStatus(save.daily, now);
  const upcoming = nextDay(save.daily, now);
  const streak = currentStreak(save.daily, now);

  const claim = () => {
    if (lock.current) return;
    lock.current = true;
    setTimeout(() => { lock.current = false; }, 800);
    const r = claimDaily();
    setMsg(r.ok ? `Day ${r.day} claimed: +${r.reward} ●` : REASON[r.reason]);
    setNow(Date.now());
  };

  const reset = () =>
    Alert.alert(
      'Reset the clock lock?',
      `Only do this if your device clock was wrong and is now correct. Your streak restarts and you can claim again in ${formatDuration(DAILY.cooldownMs)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { setMsg(resetClockLock() ? 'Clock lock reset.' : ''); setNow(Date.now()); } },
      ],
    );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <MenuButton label="BACK" icon="back" compact onPress={() => navigation.goBack()} />
        <Text style={styles.title}>DAILY REWARD</Text>
        <Text style={styles.coins}>● {save.coins}</Text>
      </View>

      <View style={styles.days}>
        {DAILY.rewards.map((r, i) => {
          const day = i + 1;
          const claimed = day < upcoming;
          const isNext = day === upcoming;
          return (
            <Panel key={day} style={[styles.cell, claimed && styles.cellDone, isNext && styles.cellNext]}>
              <Text style={styles.cellDay}>DAY {day}</Text>
              <Text style={styles.cellReward}>● {r}</Text>
              <Text style={styles.cellState}>{claimed ? '✓' : isNext ? 'NEXT' : ''}</Text>
            </Panel>
          );
        })}
      </View>

      <Text style={styles.streak}>Streak: {streak} day{streak === 1 ? '' : 's'} · Total claims: {save.daily.totalClaims}</Text>

      {status.kind === 'ready' && <MenuButton label={`CLAIM ● ${status.reward}`} variant="primary" onPress={claim} />}
      {status.kind === 'wait' && <Text style={styles.wait}>Next reward in {formatDuration(status.msLeft)}</Text>}
      {status.kind === 'clock_back' && (
        <View style={styles.warn}>
          <Text style={styles.warnTxt}>
            Your device clock is earlier than the last time the game saw. Daily rewards are paused to keep them fair.
            {status.msLeft > 0 ? ` They resume in ${formatDuration(status.msLeft)}, or fix your clock.` : ''}
          </Text>
          <MenuButton label="MY CLOCK WAS WRONG: RESET" variant="danger" compact onPress={reset} />
        </View>
      )}
      {!!msg && <Text style={styles.msg}>{msg}</Text>}
      <Text style={styles.note}>Come back within {formatDuration(DAILY.streakBreakMs)} of your last claim to keep your streak.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 8, alignItems: 'center', gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, alignSelf: 'stretch' },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 20, letterSpacing: 5 },
  coins: { color: COLORS.gold, fontWeight: '800' },
  days: { flexDirection: 'row', gap: 8, marginTop: 6 },
  cell: { width: 78, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 2 },
  cellDone: { backgroundColor: '#14261c', borderColor: '#4cd964' },
  cellNext: { borderColor: COLORS.gold },
  cellDay: { color: COLORS.dim, fontSize: 10, fontWeight: '800' },
  cellReward: { color: COLORS.gold, fontWeight: '900', fontSize: 15 },
  cellState: { color: COLORS.text, fontSize: 10, fontWeight: '800', height: 12 },
  streak: { color: '#cfd0e6', fontWeight: '700', fontSize: 12 },
  wait: { color: COLORS.gold, fontWeight: '800', fontSize: 16 },
  warn: { alignItems: 'center', gap: 8, maxWidth: 560 },
  warnTxt: { color: '#ff9a8a', textAlign: 'center', fontSize: 12 },
  msg: { color: '#9fe8a8', fontWeight: '800' },
  note: { color: COLORS.dim, fontSize: 11 },
});