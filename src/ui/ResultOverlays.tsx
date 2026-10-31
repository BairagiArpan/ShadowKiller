import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RewardBreakdown } from '../levels/progress';
import { MenuButton } from './MenuButton';
import { Panel } from './Panel';
import { COLORS } from './theme';

const W = 220;

export function PauseMenu(p: {
  onResume: () => void; onRestart: () => void; onSettings: () => void; onMenu: () => void;
}) {
  return (
    <View style={styles.overlay}>
      <Panel style={styles.panel}>
        <Text style={styles.paused}>PAUSED</Text>
        <MenuButton label="RESUME" variant="primary" glyph="▶" width={W} onPress={p.onResume} />
        <MenuButton label="RESTART" width={W} onPress={p.onRestart} />
        <MenuButton label="SETTINGS" width={W} onPress={p.onSettings} />
        <MenuButton label="MAIN MENU" width={W} onPress={p.onMenu} />
      </Panel>
    </View>
  );
}

function breakdown(r: RewardBreakdown): string {
  return [
    r.firstClear ? `clear ${r.firstClear}` : '',
    r.starBonus ? `stars ${r.starBonus}` : '',
    r.replay ? `replay ${r.replay}` : '',
    r.challenge ? `challenge ${r.challenge}` : '',
  ].filter(Boolean).join(' · ');
}

export function VictoryPanel(p: {
  title: string; stars?: number; score?: number; objectiveMet?: boolean; reward: RewardBreakdown | null; xp?: number; levelUp?: boolean;
  onNext?: () => void; onRetry: () => void; onExit: () => void; exitLabel: string;
}) {
  const stars = p.stars ?? 0;
  return (
    <View style={styles.overlay}>
      <Panel style={[styles.panel, styles.gold]}>
        <Text style={styles.victory}>{p.title}</Text>
        {p.stars !== undefined && (
          <Text style={styles.stars}>{'★'.repeat(stars)}<Text style={styles.starOff}>{'★'.repeat(3 - stars)}</Text></Text>
        )}
        {p.score !== undefined && (
          <Text style={styles.line}>Score {p.score} · Objective {p.objectiveMet ? 'met' : 'missed'}</Text>
        )}
        {p.xp ? <Text style={styles.xp}>+{p.xp} XP</Text> : null}
        {p.levelUp ? <Text style={styles.levelUp}>LEVEL UP! Spend your skill point in SKILLS</Text> : null}
        {p.reward && p.reward.total > 0 && (
          <>
            <Text style={styles.coins}>+{p.reward.total} ●</Text>
            <Text style={styles.detail}>{breakdown(p.reward)}</Text>
          </>
        )}
        <View style={styles.row}>
          {p.onNext && <MenuButton label="NEXT" variant="primary" compact onPress={p.onNext} />}
          <MenuButton label="RETRY" compact onPress={p.onRetry} />
          <MenuButton label={p.exitLabel} compact onPress={p.onExit} />
        </View>
      </Panel>
    </View>
  );
}

export function DefeatPanel(p: { onRetry: () => void; onExit: () => void; exitLabel: string }) {
  return (
    <View style={styles.overlay}>
      <Panel style={styles.panel}>
        <Text style={styles.defeat}>DEFEAT</Text>
        <MenuButton label="RETRY" variant="danger" width={W} onPress={p.onRetry} />
        <MenuButton label={p.exitLabel} variant="info" width={W} onPress={p.onExit} />
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center' },
  panel: { alignItems: 'center', gap: 8, minWidth: 260 },
  gold: { borderColor: COLORS.gold },
  paused: { color: COLORS.text, fontSize: 26, fontWeight: '900', letterSpacing: 6, marginBottom: 4 },
  victory: { color: COLORS.gold, fontSize: 30, fontWeight: '900', letterSpacing: 5 },
  defeat: { color: '#e0334c', fontSize: 30, fontWeight: '900', letterSpacing: 6, marginBottom: 4 },
  stars: { color: COLORS.gold, fontSize: 30 },
  starOff: { color: '#3a3a4d' },
  line: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  coins: { color: COLORS.gold, fontWeight: '900', fontSize: 18 },
  detail: { color: COLORS.dim, fontSize: 11 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  xp: { color: '#8fe3ff', fontWeight: '900', fontSize: 14 },
  levelUp: { color: '#ffd27a', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
});