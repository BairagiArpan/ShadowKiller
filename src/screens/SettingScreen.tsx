import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { PRESETS, QUALITY_ORDER } from '../config/graphics';
import { MenuButton } from '../ui/MenuButton';
import { Slider } from '../ui/Slider';
import { COLORS } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowCtl}>{children}</View>
    </View>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const { save, updateSettings } = useSave();
  const s = save.settings;
  const size = Math.round(s.controlSize * 100);
  const step = (d: number) => updateSettings({ controlSize: Math.round((s.controlSize + d) * 10) / 10 });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <MenuButton label="◀ BACK" compact onPress={() => navigation.goBack()} />
        <Text style={styles.title}>SETTINGS</Text>
        <View style={{ width: 90 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Row label="SOUND">
          <Slider value={s.sound ? s.soundVolume : 0}
            onCommit={(v) => updateSettings(v > 0 ? { sound: true, soundVolume: v } : { sound: false })} />
        </Row>
        <Row label="MUSIC">
          <Slider value={s.music ? s.musicVolume : 0}
            onCommit={(v) => updateSettings(v > 0 ? { music: true, musicVolume: v } : { music: false })} />
        </Row>
        <Row label="VIBRATION">
          <Switch value={s.vibration} onValueChange={(v) => updateSettings({ vibration: v })}
            trackColor={{ false: '#3a3a4d', true: '#b8730f' }} />
        </Row>
        <Row label="GRAPHICS">
          {QUALITY_ORDER.map((q) => (
            <MenuButton key={q} label={PRESETS[q].label.toUpperCase()} compact
              variant={s.graphics === q ? 'primary' : 'default'} onPress={() => updateSettings({ graphics: q })} />
          ))}
        </Row>
        <Text style={styles.note}>{PRESETS[s.graphics].description} If the game runs slowly it lowers this for the session only.</Text>
        <Row label="FRAME RATE">
          <MenuButton label="30 FPS" compact variant={s.fps === 30 ? 'primary' : 'default'} onPress={() => updateSettings({ fps: 30 })} />
          <MenuButton label="60 FPS" compact variant={s.fps === 60 ? 'primary' : 'default'} onPress={() => updateSettings({ fps: 60 })} />
        </Row>
        <Row label="CONTROLS">
          <MenuButton label="BUTTONS" compact variant={s.controls === 'buttons' ? 'primary' : 'default'}
            onPress={() => updateSettings({ controls: 'buttons' })} />
          <MenuButton label="JOYSTICK" compact variant={s.controls === 'joystick' ? 'primary' : 'default'}
            onPress={() => updateSettings({ controls: 'joystick' })} />
        </Row>
        <Row label="CONTROL SIZE">
          <MenuButton label="−" compact onPress={() => step(-0.1)} />
          <Text style={styles.value}>{size}%</Text>
          <MenuButton label="+" compact onPress={() => step(0.1)} />
        </Row>
        <Row label="LANGUAGE">
          <MenuButton label="ENGLISH" compact variant="primary" onPress={() => {}} />
        </Row>
        <Text style={styles.note}>Only English exists so far. Combat speed is the same at 30 and 60 FPS.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 20, letterSpacing: 6 },
  body: { paddingHorizontal: 40, paddingVertical: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1c1c2b', paddingVertical: 4 },
  rowLabel: { color: COLORS.text, fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  rowCtl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { color: COLORS.text, fontWeight: '800', width: 50, textAlign: 'center' },
  note: { color: COLORS.dim, fontSize: 11 },
});