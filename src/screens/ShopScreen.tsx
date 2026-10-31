import React, { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { AnyItem, itemsOf, priceOf, resolveCharacter, resolveWeapon, starGateOf } from '../cosmetics/catalog';
import { CharacterSkin, ItemKind, RARITY_COLOR, WeaponSkin } from '../cosmetics/types';
import { PurchaseFailure, equippedId, itemState, totalStars } from '../economy/shop';
import { CharacterArt, WeaponArt } from '../components/FighterArt';
import { FIGHTER_H, FIGHTER_W } from '../engine/constants';
import { MenuButton } from '../ui/MenuButton';
import { Panel } from '../ui/Panel';
import { COLORS } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Characters' | 'Weapons'>;

const REASON: Record<PurchaseFailure, string> = {
  unknown_item: 'That item does not exist.',
  already_owned: 'You already own this.',
  insufficient_coins: 'Not enough coins.',
  need_stars: 'You need more stars first.',
  invalid_price: 'This item cannot be bought right now.',
};

const swatchOf = (kind: ItemKind, i: AnyItem): string =>
  kind === 'character' ? (i as CharacterSkin).visual.accent : (i as WeaponSkin).visual.glow;

export default function ShopScreen({ navigation, route }: Props) {
  const kind: ItemKind = route.name === 'Weapons' ? 'weapon' : 'character';
  const { save, purchase, equip } = useSave();
  const items = itemsOf(kind);

  const [selectedId, setSelectedId] = useState(() => equippedId(save, kind));
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const busy = useRef(false); // blocks double taps on CONFIRM until the dialog is opened again

  const selected: AnyItem = items.find((i) => i.id === selectedId) ?? items[0];
  const state = itemState(save, kind, selected.id);
  const price = priceOf(kind, selected);
  const gate = starGateOf(kind, selected);
  const stars = totalStars(save);

  const charSkin = kind === 'character'
    ? (selected as CharacterSkin) : resolveCharacter(save.inventory.equippedCharacter);
  const weaponSkin = kind === 'weapon'
    ? (selected as WeaponSkin) : resolveWeapon(save.inventory.equippedWeapon);

  const openConfirm = () => { busy.current = false; setConfirm(true); };
  const doPurchase = () => {
    if (busy.current) return;
    busy.current = true;
    const res = purchase(kind, selected.id);
    setConfirm(false);
    setMessage(res.ok ? `Purchased ${selected.name}!` : REASON[res.reason]);
  };
  const doEquip = () => setMessage(equip(kind, selected.id) ? `${selected.name} equipped.` : 'Cannot equip that.');

  const badge = (id: string, p: number, g: number) => {
    const s = itemState(save, kind, id);
    if (s === 'equipped') return 'EQUIPPED';
    if (s === 'owned') return 'OWNED';
    if (s === 'locked') return `🔒 ${g}★`;
    return `● ${p}`;
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <MenuButton label="BACK" icon="back" compact onPress={() => navigation.goBack()} />
        <View style={styles.tabs}>
          <MenuButton label="CHARACTERS" compact variant={kind === 'character' ? 'primary' : 'default'}
            onPress={() => { if (kind !== 'character') navigation.replace('Characters'); }} />
          <MenuButton label="WEAPONS" compact variant={kind === 'weapon' ? 'primary' : 'default'}
            onPress={() => { if (kind !== 'weapon') navigation.replace('Weapons'); }} />
        </View>
        <Text style={styles.coins}>★ {stars}   ● {save.coins}</Text>
      </View>

      <View style={styles.body}>
        <FlatList
          style={styles.grid}
          data={items}
          numColumns={4}
          keyExtractor={(i) => i.id}
          extraData={[save, selectedId]}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setSelectedId(item.id); setMessage(''); }}
              style={[
                styles.card,
                { borderColor: RARITY_COLOR[item.rarity] },
                selected.id === item.id && styles.cardSelected,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: swatchOf(kind, item) }]} />
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cardBadge}>{badge(item.id, priceOf(kind, item), starGateOf(kind, item))}</Text>
            </Pressable>
          )}
        />

        <Panel style={styles.panel}>
          <ScrollView contentContainerStyle={styles.panelInner}>
            {/* PLACEHOLDER ART preview: the same shapes used in combat */}
            <Canvas style={styles.preview}>
              <Rect x={0} y={0} width={190} height={150} color="#14122a" />
              <Rect x={0} y={128} width={190} height={22} color="#1c1838" />
              <Group transform={[{ translateX: 62 }, { translateY: 128 }, { scale: 1.25 }]}>
                <CharacterArt look={charSkin.visual} color={charSkin.visual.body} />
                <Group transform={[{ translateX: FIGHTER_W / 2 - 6 }, { translateY: -FIGHTER_H * 0.62 }, { rotate: -0.35 }]}>
                  <WeaponArt weapon={weaponSkin.visual} />
                </Group>
              </Group>
            </Canvas>

            <Text style={styles.pName}>{selected.name}</Text>
            <Text style={[styles.pRarity, { color: RARITY_COLOR[selected.rarity] }]}>{selected.rarity.toUpperCase()}</Text>
            <Text style={styles.pBlurb}>{selected.blurb}</Text>
            {kind === 'weapon' && <Text style={styles.pBlurb}>Hit effect: {weaponSkin.visual.hitFx} · cosmetic only</Text>}
            {kind === 'character' && <Text style={styles.pBlurb}>Cosmetic only: no gameplay change.</Text>}

            <View style={styles.action}>
              {state === 'equipped' && <MenuButton label="EQUIPPED" icon="check" compact onPress={() => {}} />}
              {state === 'owned' && <MenuButton label="EQUIP" variant="primary" compact onPress={doEquip} />}
              {state === 'locked' && <Text style={styles.lock}>🔒 Needs {gate}★ in total (you have {stars}★)</Text>}
              {state === 'buyable' && (save.coins >= price
                ? <MenuButton label={`BUY ● ${price}`} variant="primary" compact onPress={openConfirm} />
                : <MenuButton label={`NEED ${price - save.coins} MORE ●`} compact onPress={() => {}} />)}
            </View>
            {!!message && <Text style={styles.msg}>{message}</Text>}
          </ScrollView>
        </Panel>
      </View>

      <Modal transparent visible={confirm} animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={styles.overlay}>
          <Panel style={styles.dialog}>
            <Text style={styles.dTitle}>Buy {selected.name}?</Text>
            <Text style={styles.dLine}>Cost ● {price}</Text>
            <Text style={styles.dLine}>Balance after: ● {Math.max(0, save.coins - price)}</Text>
            <View style={styles.dRow}>
              <MenuButton label="CONFIRM" variant="primary" compact onPress={doPurchase} />
              <MenuButton label="CANCEL" compact onPress={() => setConfirm(false)} />
            </View>
          </Panel>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  tabs: { flexDirection: 'row', gap: 6 },
  coins: { color: COLORS.gold, fontWeight: '800' },
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: 12, gap: 12 },
  grid: { flex: 1 },
  card: { width: 104, margin: 4, padding: 6, borderRadius: 8, borderWidth: 2, backgroundColor: '#12121b', alignItems: 'center', gap: 3 },
  cardSelected: { backgroundColor: '#2a2236', borderColor: COLORS.gold },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  cardName: { color: COLORS.text, fontSize: 10, fontWeight: '700' },
  cardBadge: { color: COLORS.gold, fontSize: 10, fontWeight: '800' },
  panel: { width: 230, marginBottom: 8, padding: 0 },
  panelInner: { padding: 10, gap: 4, alignItems: 'center' },
  preview: { width: 190, height: 150, borderRadius: 6 },
  pName: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  pRarity: { fontWeight: '800', fontSize: 11, letterSpacing: 2 },
  pBlurb: { color: '#cfd0e6', fontSize: 11, textAlign: 'center' },
  action: { marginTop: 6 },
  lock: { color: '#c77', fontWeight: '700', fontSize: 11, textAlign: 'center' },
  msg: { color: '#9fe8a8', fontWeight: '700', fontSize: 11, marginTop: 4, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  dialog: { gap: 4, alignItems: 'center', minWidth: 280 },
  dTitle: { color: COLORS.text, fontWeight: '900', fontSize: 18 },
  dLine: { color: COLORS.gold, fontWeight: '700' },
  dRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
});