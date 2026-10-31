
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSave } from '../persistence/SaveProvider';
import { nextPlayable } from '../levels/progress';
import { playMusic } from '../audio/audio';
import { dailyStatus } from '../economy/daily';
import { claimableCount } from '../achievements/progress';
import { WORLDS } from '../levels/worlds';
import { MenuButton } from '../ui/MenuButton';
import { COLORS } from '../ui/theme';
import { availablePoints } from '../skills/progress';
import { Icon } from '../ui/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { save } = useSave();
  const { width, height } = useWindowDimensions();

  const next = nextPlayable(save);
  const world = WORLDS[next.world - 1] ?? WORLDS[0];
  const palette = world.palette;

  const dailyReady =
    dailyStatus(save.daily, Date.now()).kind === 'ready';

  const claimable = claimableCount(save);
  const skillPoints = availablePoints(save.hero);

  const smallScreen = width < 700;
  const shortScreen = height < 380;

  useEffect(() => {
    playMusic('menu');

    const unsubscribe = navigation.addListener('focus', () => {
      playMusic('menu');
    });

    return unsubscribe;  
  }, [navigation]); 

  return (
    <View style={styles.root}>

      {/* Background */}
      <View pointerEvents="none" style={styles.background}>
        <View style={styles.backgroundGlow} />
        <View style={styles.backgroundBottom} />
        <View style={styles.emberOne} />
        <View style={styles.emberTwo} />
        <View style={styles.emberThree} />
      </View>

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View style={styles.rankBox}>
          <View style={styles.rankIcon}>
            <Icon name="star" size={23} color={COLORS.goldLight} />
          </View>

          <View>
            <Text style={styles.rankTitle}>SHADOW WARRIOR</Text>
            <Text style={styles.rankSubtitle}>YOUR JOURNEY BEGINS</Text>
          </View>
        </View>

        <View style={styles.coinsBox}>
          <Icon name="coin" size={20} color={COLORS.gold} />
          <Text style={styles.coinsText}>
            {Number(save.coins ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* MAIN LANDSCAPE CONTENT */}
      <View style={styles.content}>

        {/* LEFT HERO PANEL */}
        <View style={styles.hero}>

          {/* Warrior artwork - full image, no cropping */}
          <Image
            source={require('../../assets/images/shadow_killer_hero_art.png')}
            resizeMode="contain"
            style={[
              styles.warriorImage,
              smallScreen && styles.warriorImageSmall,
            ]}
          />

          {/* Image dark gradient-style overlay */}
          <View pointerEvents="none" style={styles.heroShade} />

          {/* Branding */}
          <View style={styles.brand}>
            <View style={styles.eyebrowRow}>
              <View style={styles.goldLine} />
              <Text style={styles.eyebrow}>THE SHADOW AWAKENS</Text>
            </View>

            <Text style={[styles.gameTitle, shortScreen && styles.gameTitleSmall]}>
              SHADOW
            </Text>

            <Text style={[
              styles.gameTitle,
              styles.gameTitleGold,
              shortScreen && styles.gameTitleSmall,
            ]}>
              KILLER
            </Text>

            <View style={styles.titleUnderline} />

            <Text style={styles.tagline}>
              MASTER YOUR BLADE.
              {'\n'}
              CONQUER THE DARK.
            </Text>
          </View>

          {/* Current world */}
          <View style={styles.worldPill}>
            <View
              style={[
                styles.worldDot,
                { backgroundColor: palette.accent },
              ]}
            />
            <View>
              <Text style={styles.worldName}>
                {world.name.toUpperCase()}
              </Text>
              <Text style={styles.worldLevel}>
                LEVEL {next.level}
              </Text>
            </View>
          </View>

          {/* Bottom features */}
          <View style={styles.heroFeatures}>
            <View style={styles.featureItem}>
              <Icon name="sword" size={21} color={COLORS.gold} />
              <Text style={styles.featureText}>FIGHT</Text>
            </View>

            <View style={styles.featureItem}>
              <Icon name="star" size={21} color={COLORS.gold} />
              <Text style={styles.featureText}>UPGRADE</Text>
            </View>

            <View style={styles.featureItem}>
              <Icon name="shop" size={21} color={COLORS.gold} />
              <Text style={styles.featureText}>COLLECT</Text>
            </View>
          </View>
        </View>

        {/* RIGHT MENU PANEL */}
        <View style={styles.menuPanel}>
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={[
              styles.menuContent,
              shortScreen && styles.menuContentSmall,
            ]}
            showsVerticalScrollIndicator={false}
          >

            {/* Header */}
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuTitle}>MAIN MENU</Text>
                <Text style={styles.menuSubtitle}>
                  CHOOSE YOUR DESTINY
                </Text>
              </View>

              <View style={styles.menuEmblem}>
                <Icon name="sword" size={22} color={COLORS.gold} />
              </View>
            </View>

            {/* PLAY */}
            <View style={styles.playCard}>
              <View style={styles.playInfo}>
                <Text style={styles.playCaption}>
                  CONTINUE YOUR JOURNEY
                </Text>
                <Text style={styles.playLevel}>
                  WORLD {next.world} · LEVEL {next.level}
                </Text>
              </View>

              <MenuButton
                label="PLAY"
                variant="primary"
                icon="play"
                sub={`WORLD ${next.world} · LEVEL ${next.level}`}
                onPress={() =>
                  navigation.navigate('Arena', {
                    mode: 'level',
                    world: next.world,
                    level: next.level,
                  })
                }
              />
            </View>

            {/* WORLDS */}
            <MenuButton
              label="WORLDS"
              icon="home"
              onPress={() => navigation.navigate('Worlds')}
            />

            {/* CHARACTER */}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionText}>
                CHARACTER & EQUIPMENT
              </Text>
              <View style={styles.sectionDivider} />
            </View>

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <MenuButton
                  label="OUTFITS"
                  icon="star"
                  onPress={() => navigation.navigate('Characters')}
                />
              </View>

              <View style={styles.column}>
                <MenuButton
                  label="WEAPONS"
                  icon="sword"
                  onPress={() => navigation.navigate('Weapons')}
                />
              </View>
            </View>

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <MenuButton
                  label="SKILLS"
                  icon="plus"
                  badge={
                    skillPoints > 0
                      ? String(skillPoints)
                      : undefined
                  }
                  onPress={() => navigation.navigate('Skills')}
                />
              </View>

              <View style={styles.column}>
                <MenuButton
                  label="GEAR"
                  icon="shop"
                  onPress={() => navigation.navigate('Gear')}
                />
              </View>
            </View>

            {/* REWARDS */}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionText}>
                REWARDS & PROGRESS
              </Text>
              <View style={styles.sectionDivider} />
            </View>

            <View style={styles.twoColumns}>
              <Pressable
                onPress={() => navigation.navigate('Daily')}
                style={({ pressed }) => [
                  styles.utilityCard,
                  dailyReady && styles.utilityReady,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="star" size={21} color={COLORS.gold} />
                <View>
                  <Text style={styles.utilityTitle}>DAILY</Text>
                  <Text style={styles.utilitySubtitle}>
                    {dailyReady ? 'REWARD READY!' : 'DAILY REWARDS'}
                  </Text>
                </View>
                {dailyReady && <View style={styles.notification} />}
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate('Progress')}
                style={({ pressed }) => [
                  styles.utilityCard,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="check" size={21} color={COLORS.gold} />
                <View>
                  <Text style={styles.utilityTitle}>PROGRESS</Text>
                  <Text style={styles.utilitySubtitle}>
                    {claimable > 0
                      ? `${claimable} TO CLAIM`
                      : 'ACHIEVEMENTS'}
                  </Text>
                </View>
                {claimable > 0 && <View style={styles.notification} />}
              </Pressable>
            </View>

            {/* MORE */}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionText}>MORE OPTIONS</Text>
              <View style={styles.sectionDivider} />
            </View>

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <MenuButton
                  label="TUTORIAL"
                  compact
                  variant="info"
                  onPress={() =>
                    navigation.navigate('Arena', {
                      mode: 'tutorial',
                    })
                  }
                />
              </View>

              <View style={styles.column}>
                <MenuButton
                  label="SETTINGS"
                  compact
                  icon="settings"
                  onPress={() => navigation.navigate('Settings')}
                />
              </View>
            </View>

            <Text style={styles.footer}>
              SHADOW KILLER · ENTER THE SHADOWS
            </Text>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05070c',
    overflow: 'hidden',
  },

  background: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },

  backgroundGlow: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#b87935',
    opacity: 0.09,
    left: '15%',
    top: '5%',
  },

  backgroundBottom: {
    position: 'absolute',
    bottom: 0,
    height: '15%',
    width: '100%',
    backgroundColor: '#080b12',
    borderTopWidth: 1,
    borderTopColor: '#574027',
  },

  emberOne: {
    position: 'absolute',
    top: '25%',
    left: '12%',
    width: 4,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#ffb64c',
  },

  emberTwo: {
    position: 'absolute',
    top: '65%',
    left: '42%',
    width: 3,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#ff8a35',
  },

  emberThree: {
    position: 'absolute',
    top: '35%',
    right: '10%',
    width: 3,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#ffb64c',
  },

  topBar: {
    height: 58,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(3,7,13,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#443522',
    zIndex: 5,
  },

  rankBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  rankIcon: {
    height: 39,
    width: 39,
    borderWidth: 1,
    borderColor: '#a77b3c',
    borderRadius: 7,
    backgroundColor: '#19170f',
    justifyContent: 'center',
    alignItems: 'center',
  },

  rankTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  rankSubtitle: {
    color: COLORS.dim,
    fontSize: 8,
    letterSpacing: 1.4,
    marginTop: 3,
  },

  coinsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#80602e',
    borderRadius: 7,
    backgroundColor: '#19160f',
  },

  coinsText: {
    color: COLORS.goldLight,
    fontSize: 14,
    fontWeight: '900',
  },

  content: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },

  hero: {
    flex: 1.15,
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: '#080d17',
    borderRightWidth: 1,
    borderRightColor: '#80602e',
  },

  warriorImage: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '72%',
    height: '100%',
    zIndex: 1,
  },

  warriorImageSmall: {
    width: '68%',
  },

  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3,6,12,0.13)',
    zIndex: 2,
  },

  brand: {
    position: 'absolute',
    top: '14%',
    left: '6%',
    width: '53%',
    zIndex: 3,
  },

  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },

  goldLine: {
    width: 22,
    height: 2,
    backgroundColor: COLORS.gold,
  },

  eyebrow: {
    color: COLORS.goldLight,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  gameTitle: {
    color: '#f5f0e8',
    fontSize: 37,
    lineHeight: 39,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowRadius: 10,
    textShadowOffset: { width: 2, height: 3 },
  },

  gameTitleSmall: {
    fontSize: 29,
    lineHeight: 31,
  },

  gameTitleGold: {
    color: '#f3b83f',
  },

  titleUnderline: {
    width: 75,
    height: 3,
    backgroundColor: COLORS.gold,
    marginTop: 8,
    marginBottom: 8,
  },

  tagline: {
    color: '#e3d8c8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    lineHeight: 16,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },

  worldPill: {
    position: 'absolute',
    left: '6%',
    bottom: '20%',
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#92703b',
    borderRadius: 6,
    backgroundColor: 'rgba(4,9,16,0.91)',
  },

  worldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  worldName: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  worldLevel: {
    color: COLORS.gold,
    fontSize: 8,
    fontWeight: '900',
    marginTop: 3,
  },

  heroFeatures: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 53,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(3,7,13,0.89)',
    borderTopWidth: 1,
    borderTopColor: '#80602e',
  },

  featureItem: {
    alignItems: 'center',
    gap: 3,
  },

  featureText: {
    color: '#eee2ce',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  menuPanel: {
    flex: 0.95,
    minWidth: 0,
    backgroundColor: 'rgba(4,9,17,0.98)',
    borderLeftWidth: 1,
    borderLeftColor: '#352b20',
  },

  menuScroll: {
    flex: 1,
    minHeight: 0,
  },

  menuContent: {
    paddingHorizontal: 13,
    paddingTop: 9,
    paddingBottom: 12,
    gap: 6,
  },

  menuContentSmall: {
    paddingTop: 5,
    gap: 4,
  },

  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 7,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#59452c',
  },

  menuTitle: {
    color: COLORS.gold,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2,
  },

  menuSubtitle: {
    color: '#aaa19a',
    fontSize: 8,
    letterSpacing: 1.5,
    marginTop: 3,
  },

  menuEmblem: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#80602e',
    borderRadius: 20,
    backgroundColor: '#19150f',
  },

  playCard: {
    padding: 7,
    borderWidth: 1,
    borderColor: '#a47a39',
    borderRadius: 7,
    backgroundColor: '#21190f',
    gap: 4,
  },

  playInfo: {
    paddingHorizontal: 3,
    gap: 2,
  },

  playCaption: {
    color: COLORS.goldLight,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  playLevel: {
    color: '#c7b9a6',
    fontSize: 8,
    fontWeight: '800',
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 3,
  },

  sectionText: {
    color: '#c0a779',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#49404a',
  },

  twoColumns: {
    flexDirection: 'row',
    gap: 7,
  },

  column: {
    flex: 1,
    minWidth: 0,
  },

  utilityCard: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    backgroundColor: '#101722',
  },

  utilityReady: {
    borderColor: COLORS.gold,
    backgroundColor: '#211a10',
  },

  utilityTitle: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  utilitySubtitle: {
    color: COLORS.dim,
    fontSize: 7,
    fontWeight: '800',
    marginTop: 3,
  },

  notification: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#e0334c',
  },

  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },

  footer: {
    textAlign: 'center',
    color: '#8a775d',
    fontSize: 7,
    letterSpacing: 1.3,
    marginTop: 3,
  },
});
