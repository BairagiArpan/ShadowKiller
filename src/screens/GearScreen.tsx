import React, { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import {
  FIGHTERS, GEAR, GearSlot, MAX_GEAR_LEVEL, WeaponCategory, getFighter, getGear, statAt, upgradeCost,
} from '../gear/catalog';
import { GearFailure, levelOf, totalStats } from '../gear/progress';
import { RARITY_COLOR, Rarity } from '../cosmetics/types';
import { MenuButton } from '../ui/MenuButton';
import { Panel } from '../ui/Panel';
import { COLORS } from '../ui/theme';
import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import { CharacterArt, WeaponArt } from '../components/FighterArt';
import { FIGHTER_H, FIGHTER_W } from '../engine/constants';
import { fighterVisual, gearWeaponVisual, outfitOverrides, skinOverrides } from '../gear/looks';
import { resolveCharacter, resolveWeapon } from '../cosmetics/catalog';
import { CATEGORY_REACH } from '../gear/catalog';

type Props = NativeStackScreenProps<RootStackParamList, 'Gear'>;
type Tab = GearSlot | 'fighter';
type Cat = 'all' | WeaponCategory;
interface Entry { id: string; name: string; rarity: Rarity | null; fighter: boolean }

const TABS: { id: Tab; label: string }[] = [
  { id: 'weapon', label: 'WEAPONS' }, { id: 'helmet', label: 'HELMET' }, { id: 'chest', label: 'CHEST' },
  { id: 'gloves', label: 'GLOVES' }, { id: 'boots', label: 'BOOTS' }, { id: 'fighter', label: 'FIGHTERS' },
];
const CATS: { id: Cat; label: string }[] = [
  { id: 'all', label: 'ALL' }, { id: 'katana', label: 'KATANA' }, { id: 'dual', label: 'DUAL BLADES' },
  { id: 'spear', label: 'SPEAR' }, { id: 'scythe', label: 'SCYTHE' },
];
const REASON: Record<GearFailure, string> = {
  unknown: 'That item cannot be bought right now.',
  already_owned: 'You already own this.',
  not_owned: 'You do not own this yet.',
  insufficient_coins: 'Not enough coins.',
  max_level: 'Already at the highest level.',
};

function entriesFor(tab: Tab, cat: Cat): Entry[] {
  if (tab === 'fighter') return FIGHTERS.map((f) => ({ id: f.id, name: f.name, rarity: null, fighter: true }));
  return GEAR
    .filter((x) => x.slot === tab && (tab !== 'weapon' || cat === 'all' || x.category === cat))
    .map((x) => ({ id: x.id, name: x.name, rarity: x.rarity, fighter: false }));
}

function statLines(s: { atk: number; def: number; hp: number; speed: number }, level: number): string[] {
  const out: string[] = [];
  if (s.atk) out.push(`ATK +${statAt(s.atk, level)}%`);
  if (s.def) out.push(`DEF +${statAt(s.def, level)}`);
  if (s.hp) out.push(`HP +${statAt(s.hp, level)}`);
  if (s.speed) out.push(`SPEED +${statAt(s.speed, level)}%`);
  return out.length ? out : ['No bonus (the baseline)'];
}

export default function GearScreen({ navigation }: Props) {
  const {
    save, buyGear, upgradeGear, equipGear, unequipGear, buyFighter, selectFighter,
  } = useSave();
  const [tab, setTab] = useState<Tab>('weapon');
  const [cat, setCat] = useState<Cat>('all');
  const [selectedId, setSelectedId] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; name: string; price: number; fighter: boolean } | null>(null);
  const [message, setMessage] = useState('');
  const busy = useRef(false); // blocks double taps on CONFIRM

  const entries = entriesFor(tab, cat);
  const sel = entries.find((e) => e.id === selectedId) ?? entries[0];
  const stats = totalStats(save);
  const gear = save.gear;

  const previewFighter = sel && sel.fighter ? sel.id : gear.fighter;
  const previewWeaponId = sel && !sel.fighter && getGear(sel.id)?.slot === 'weapon' ? sel.id : (gear.equipped.weapon ?? '');
  const charLook = outfitOverrides(save) ? resolveCharacter(save.inventory.equippedCharacter).visual : fighterVisual(previewFighter);
  const weaponLook = skinOverrides(save) ? resolveWeapon(save.inventory.equippedWeapon).visual : gearWeaponVisual(previewWeaponId);
  const overridden = outfitOverrides(save) || skinOverrides(save);

  const badge = (e: Entry): string => {
    if (e.fighter) {
      if (gear.fighter === e.id) return 'SELECTED';
      return gear.fighters.includes(e.id) ? 'OWNED' : `● ${getFighter(e.id)!.price}`;
    }
    const item = getGear(e.id)!;
    if (gear.equipped[item.slot] === e.id) return 'EQUIPPED';
    const lv = levelOf(save, e.id);
    return lv > 0 ? `Lv ${lv}` : `● ${item.price}`;
  };

  const openConfirm = (id: string, name: string, price: number, fighter: boolean) => {
    busy.current = false;
    setConfirm({ id, name, price, fighter });
  };
  const doBuy = () => {
    if (busy.current || !confirm) return;
    busy.current = true;
    const r = confirm.fighter ? buyFighter(confirm.id) : buyGear(confirm.id);
    setConfirm(null);
    setMessage(r.ok ? `Bought ${confirm.name}!` : REASON[r.reason]);
  };
  const doUpgrade = (id: string) => {
    const r = upgradeGear(id);
    setMessage(r.ok ? 'Upgraded!' : REASON[r.reason]);
  };

  let panel: React.ReactNode = null;
  if (sel && sel.fighter) {
    const f = getFighter(sel.id)!;
    const owned = gear.fighters.includes(f.id);
    panel = (
      <>
        <Text style={styles.pName}>{f.name}</Text>
        <Text style={styles.pBlurb}>{f.blurb}</Text>
        {statLines(f.stats, 1).map((l) => <Text key={l} style={styles.pStat}>{l}</Text>)}
        <Text style={styles.pNote}>A combat role. Your outfit only changes how it looks.</Text>
        <View style={styles.actions}>
          {gear.fighter === f.id && <MenuButton label="SELECTED" icon="check" compact onPress={() => {}} />}
          {owned && gear.fighter !== f.id && (
            <MenuButton label="SELECT" variant="primary" compact
              onPress={() => setMessage(selectFighter(f.id) ? `${f.name} selected.` : 'Cannot select that.')} />
          )}
          {!owned && (save.coins >= f.price
            ? <MenuButton label={`BUY ● ${f.price}`} variant="primary" compact onPress={() => openConfirm(f.id, f.name, f.price, true)} />
            : <MenuButton label={`NEED ${f.price - save.coins} MORE ●`} compact onPress={() => setMessage(REASON.insufficient_coins)} />)}
        </View>
      </>
    );
  } else if (sel) {
    const item = getGear(sel.id)!;
    const lv = levelOf(save, item.id);
    const equipped = gear.equipped[item.slot] === item.id;
    panel = (
      <>
        <Text style={styles.pName}>{item.name}</Text>
        <Text style={[styles.pRarity, { color: RARITY_COLOR[item.rarity] }]}>
          {item.rarity.toUpperCase()} · {'★'.repeat(item.stars)}{lv > 0 ? ` · Lv ${lv}/${MAX_GEAR_LEVEL}` : ''}
        </Text>
        <Text style={styles.pBlurb}>{item.blurb}</Text>
        {statLines(item.stats, Math.max(1, lv)).map((l) => <Text key={l} style={styles.pStat}>{l}</Text>)}
            {item.category && CATEGORY_REACH[item.category] > 1 && (
          <Text style={styles.pStat}>REACH +{Math.round((CATEGORY_REACH[item.category] - 1) * 100)}%</Text>
        )}
        <View style={styles.actions}>
          {lv === 0 && (save.coins >= item.price
            ? <MenuButton label={`BUY ● ${item.price}`} variant="primary" compact onPress={() => openConfirm(item.id, item.name, item.price, false)} />
            : <MenuButton label={`NEED ${item.price - save.coins} MORE ●`} compact onPress={() => setMessage(REASON.insufficient_coins)} />)}
          {lv > 0 && equipped && <MenuButton label="EQUIPPED" icon="check" compact onPress={() => {}} />}
          {lv > 0 && !equipped && (
            <MenuButton label="EQUIP" variant="primary" compact
              onPress={() => setMessage(equipGear(item.id) ? `${item.name} equipped.` : 'Cannot equip that.')} />
          )}
          {lv > 0 && equipped && item.slot !== 'weapon' && (
            <MenuButton label="UNEQUIP" compact
              onPress={() => setMessage(unequipGear(item.slot as 'helmet' | 'chest' | 'gloves' | 'boots') ? 'Removed.' : 'Nothing to remove.')} />
          )}
          {lv > 0 && lv < MAX_GEAR_LEVEL && (
            <MenuButton label={`UPGRADE ● ${upgradeCost(item, lv)}`} compact
              variant={save.coins >= upgradeCost(item, lv) ? 'info' : 'default'} onPress={() => doUpgrade(item.id)} />
          )}
          {lv >= MAX_GEAR_LEVEL && <Text style={styles.max}>MAX LEVEL</Text>}
        </View>
      </>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <MenuButton label="BACK" icon="back" compact onPress={() => navigation.goBack()} />
        <Text style={styles.title}>GEAR</Text>
        <Text style={styles.coins}>● {save.coins}</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <MenuButton key={t.id} label={t.label} compact variant={tab === t.id ? 'primary' : 'default'}
            onPress={() => { setTab(t.id); setSelectedId(''); setMessage(''); }} />
        ))}
      </View>
      {tab === 'weapon' && (
        <View style={styles.tabs}>
          {CATS.map((c) => (
            <MenuButton key={c.id} label={c.label} compact variant={cat === c.id ? 'info' : 'default'}
              onPress={() => { setCat(c.id); setSelectedId(''); }} />
          ))}
        </View>
      )}

      <View style={styles.statBar}>
        <Text style={styles.stat}>HP {stats.hp}</Text>
        <Text style={styles.stat}>ATK {stats.atk}</Text>
        <Text style={styles.stat}>DEF {stats.def}</Text>
        <Text style={styles.stat}>SPEED {stats.speed}</Text>
      </View>

      <View style={styles.body}>
        <FlatList
          style={styles.grid}
          data={entries}
          numColumns={3}
          keyExtractor={(e) => e.id}
          extraData={[save, selectedId, tab, cat]}
          renderItem={({ item: e }) => (
            <Pressable
              onPress={() => { setSelectedId(e.id); setMessage(''); }}
              style={[
                styles.card,
                { borderColor: e.rarity ? RARITY_COLOR[e.rarity] : '#2a2a3d' },
                sel && sel.id === e.id && styles.cardSel,
              ]}
            >
              <Text style={styles.cardName} numberOfLines={2}>{e.name}</Text>
              <Text style={styles.cardBadge}>{badge(e)}</Text>
            </Pressable>
          )}
        />
        <Panel style={styles.panel}>
          <ScrollView contentContainerStyle={styles.panelInner}>
            <Canvas style={styles.preview}>
              <Rect x={0} y={0} width={190} height={130} color="#14122a" />
              <Rect x={0} y={112} width={190} height={18} color="#1c1838" />
              <Group transform={[{ translateX: 62 }, { translateY: 112 }, { scale: 1.1 }]}>
                <CharacterArt look={charLook} color={charLook.body} />
                <Group transform={[{ translateX: FIGHTER_W / 2 - 6 }, { translateY: -FIGHTER_H * 0.62 }, { rotate: -0.35 }]}>
                  <WeaponArt weapon={weaponLook} />
                </Group>
              </Group>
            </Canvas>
            {overridden && (
              <Text style={styles.pNote}>
                Your equipped outfit or weapon skin is shown instead. Set it back to the starter in OUTFITS or WEAPON SKINS to see gear looks.
              </Text>
            )}
            {panel}
            {!!message && <Text style={styles.msg}>{message}</Text>}
          </ScrollView>
        </Panel>
      </View>

      <Modal transparent visible={confirm !== null} animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.overlay}>
          <Panel style={styles.dialog}>
            <Text style={styles.dTitle}>Buy {confirm?.name}?</Text>
            <Text style={styles.dLine}>Cost ● {confirm?.price}</Text>
            <Text style={styles.dLine}>Balance after: ● {Math.max(0, save.coins - (confirm?.price ?? 0))}</Text>
            <View style={styles.dRow}>
              <MenuButton label="CONFIRM" variant="primary" compact onPress={doBuy} />
              <MenuButton label="CANCEL" compact onPress={() => setConfirm(null)} />
            </View>
          </Panel>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  title: { color: COLORS.text, fontWeight: '900', fontSize: 20, letterSpacing: 6 },
  coins: { color: COLORS.gold, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 4, flexWrap: 'wrap' },
  statBar: { flexDirection: 'row', gap: 18, paddingHorizontal: 18, paddingBottom: 4 },
  stat: { color: COLORS.goldLight, fontWeight: '800', fontSize: 12 },
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: 12, gap: 12 },
  grid: { flex: 1 },
  card: { flex: 1, margin: 4, minHeight: 64, padding: 8, borderRadius: 8, borderWidth: 2, backgroundColor: '#12121b', justifyContent: 'space-between', maxWidth: '32%' },
  cardSel: { backgroundColor: '#2a2236', borderColor: COLORS.gold },
  cardName: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  cardBadge: { color: COLORS.gold, fontSize: 10, fontWeight: '800' },
  panel: { width: 240, marginBottom: 8, padding: 0 },
  panelInner: { padding: 12, gap: 4 },
  pName: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  pRarity: { fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  pBlurb: { color: '#cfd0e6', fontSize: 11 },
  pStat: { color: COLORS.goldLight, fontWeight: '700', fontSize: 12 },
  pNote: { color: COLORS.dim, fontSize: 10 },
  actions: { marginTop: 8, gap: 6 },
  max: { color: '#4cd964', fontWeight: '900' },
  msg: { color: '#9fe8a8', fontWeight: '700', fontSize: 11, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  dialog: { gap: 4, alignItems: 'center', minWidth: 280 },
  dTitle: { color: COLORS.text, fontWeight: '900', fontSize: 18 },
  dLine: { color: COLORS.gold, fontWeight: '700' },
  dRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  preview: { width: 190, height: 130, borderRadius: 6, alignSelf: 'center' },
});