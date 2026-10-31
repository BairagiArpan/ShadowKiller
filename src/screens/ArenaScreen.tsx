import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Group, Points, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { createArena, emptyInput, stepArena } from '../engine/arena';
import {
  FIXED_DT, GROUND_Y, MAX_ENEMIES, MAX_HAZARDS, MAX_PROJECTILES, WORLD_H, WORLD_W,
} from '../engine/constants';
import { BOSSES, bossLabel } from '../engine/bosses';
import { NO_POINTS, Point, pointsOf, setParticleLimits } from '../engine/particles';
import { RenderFrame, buildFrame } from '../engine/render';
import { TUTORIAL_STEPS } from '../engine/tutorial';
import { Arena, EnemyKind, Input } from '../engine/types';
import { FighterView, HazardView, ProjectileView } from '../components/FighterView';
import { HitFxView } from '../components/HitFxView';
import { Background } from '../components/Background';
import { enemyLookFor, enemyWeaponFor } from '../cosmetics/enemyLook';
import { resolveCharacter, resolveWeapon } from '../cosmetics/catalog';
import { applyChallenge, getLevel } from '../levels';
import { LevelConfig } from '../levels/types';
import { evaluateRun } from '../levels/scoring';
import { RewardBreakdown, isLevelUnlocked } from '../levels/progress';
import { WORLDS } from '../levels/worlds';
import { useSave } from '../persistence/SaveProvider';
import { AMBIENT_LOOK, PRESETS, Quality, ambientStyleFor, lowerQuality } from '../config/graphics';
import { PerfGovernor } from '../config/perf';
import { SHOW_PERF } from '../config/dev';
import { FrameStats } from '../config/frameStats';
import { MusicTrack, playMusic, playSfx } from '../audio/audio';
import { DefeatPanel, PauseMenu, VictoryPanel } from '../ui/ResultOverlays';
import { Joystick } from '../ui/Joystick';
import { joystickToInput } from '../ui/controlsLogic';
import { buzz } from '../ui/haptics';
import { Panel } from '../ui/Panel'; 
import { perksFor } from '../skills/progress';
import { levelFor, xpFromCoins } from '../skills/xp';
import { combinePerks } from '../engine/perks';
import { gearPerks } from '../gear/progress';
import { playerCharacterVisual, playerWeaponVisual } from '../gear/looks';

type Props = NativeStackScreenProps<RootStackParamList, 'Arena'>;
type OneShot = 'light' | 'heavy' | 'jump' | 'dodge' | 'special';
type Held = 'left' | 'right' | 'block';
interface Hud { combo: number; wave: number; step: number; boss: string; kinds: string }
interface Summary { stars: number; score: number; objectiveMet: boolean; reward: RewardBreakdown | null;  xp: number; levelUp: boolean; }

const sameHud = (a: Hud, b: Hud) =>
  a.combo === b.combo && a.wave === b.wave && a.step === b.step && a.boss === b.boss && a.kinds === b.kinds;

const readHud = (a: Arena): Hud => ({
  combo: a.combo.count, wave: a.wave, step: a.tutorial ? a.tutorial.index : -1,
  boss: bossLabel(a), kinds: a.enemies.map((e) => e.kind).join(','),
});

function makeArena(cfg: LevelConfig | null, q: Quality, perks?: ReturnType<typeof perksFor>): Arena {
  const p = PRESETS[q];
  const particles = {
    style: ambientStyleFor(cfg?.world ?? 1), ambient: p.ambient, impactCap: p.impactCap, perHit: p.impactPerHit,
  };
  if (!cfg) return createArena({ waves: [], tutorial: true, particles });
  return createArena({
    waves: cfg.waves, scaling: cfg.scaling, hazards: cfg.hazards, healPerWave: cfg.healPerWave,
    world: cfg.world, miniBoss: cfg.miniBoss, particles, perks,
  });
}

const ENEMY_SLOTS = Array.from({ length: MAX_ENEMIES }, (_, i) => i);
const PROJECTILE_SLOTS = Array.from({ length: MAX_PROJECTILES }, (_, i) => i);
const HAZARD_SLOTS = Array.from({ length: MAX_HAZARDS }, (_, i) => i);

export default function ArenaScreen({ navigation, route }: Props) {
  const params = route.params;
  const { save, recordResult } = useSave();
  const settings = save.settings;
  const vibrationRef = useRef(settings.vibration);
  vibrationRef.current = settings.vibration;
  const jumpHeld = useRef(false);
  const challenge = params.mode === 'level' && !!params.challenge;

  const [character] = useState(() => ({ visual: playerCharacterVisual(save) }));
  const [weapon] = useState(() => ({ visual: playerWeaponVisual(save) }));
  const [perks] = useState(() => combinePerks(perksFor(save.hero.ranks), gearPerks(save)));

  const cfg = useMemo<LevelConfig | null>(() => {
    if (params.mode !== 'level') return null;
    const base = getLevel(params.world, params.level);
    return params.challenge ? applyChallenge(base) : base;
  }, [params]);
  const worldIdx = params.mode === 'level' ? params.world : 1;
  const worldDef = WORLDS[worldIdx - 1];
  const palette = worldDef.palette;
  const bossInfo = cfg && (cfg.worldBoss || cfg.miniBoss) ? BOSSES[cfg.world] : null;

  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / WORLD_W, height / WORLD_H);
  const offX = (width - WORLD_W * scale) / 2;
  const offY = (height - WORLD_H * scale) / 2;

  // Graphics: starts at the saved preset and can only be lowered during a session.
  const [quality, setQuality] = useState<Quality>(settings.graphics);
  const qualityRef = useRef<Quality>(settings.graphics);
  const preset = PRESETS[quality];
  const governor = useMemo(() => new PerfGovernor(1000 / settings.fps), [settings.fps]);
  const governorRef = useRef(governor);
  governorRef.current = governor;
  const minInterval = useRef(1000 / settings.fps - 2);
  const [toast, setToast] = useState('');

  const frameStats = useRef(new FrameStats());
  const [perfTxt, setPerfTxt] = useState('');

  const [initial] = useState(() => makeArena(cfg, settings.graphics, perks));
  const arena = useRef<Arena>(initial);
  const input = useRef<Input>(emptyInput());
  const paused = useRef(bossInfo !== null);
  const shown = useRef(false);
  const lastHud = useRef<Hud>(readHud(initial));

  const [intro, setIntro] = useState(bossInfo !== null);
  const [result, setResult] = useState<null | 'victory' | 'defeat'>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [hud, setHud] = useState<Hud>(lastHud.current);

  const onOver = useRef<(a: Arena) => void>(() => {});
  onOver.current = (a) => {
    if (!cfg) { setResult(a.over); return; }
    const run = evaluateRun(cfg, a);
    const levelBefore = levelFor(save.hero.xp);
    const out = recordResult(cfg, run, challenge, a.stats);
    const reward = run.won ? out : null;
    const xp = reward ? xpFromCoins(reward.total) : 0;
    setSummary({
      stars: run.stars, score: run.score, objectiveMet: run.objectiveMet, reward,
      xp, levelUp: levelFor(save.hero.xp + xp) > levelBefore,
    });
    setResult(a.over);
  };

  const onDowngrade = useRef<() => void>(() => {});
  onDowngrade.current = () => {
    const next = lowerQuality(qualityRef.current);
    if (next === qualityRef.current) return;
    qualityRef.current = next;
    setQuality(next);
    setParticleLimits(arena.current.particles, PRESETS[next].ambient, PRESETS[next].impactPerHit);
    setToast(`Graphics lowered to ${PRESETS[next].label} to keep the game smooth`);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    playMusic(bossInfo ? 'boss' : (`world_${worldIdx}` as MusicTrack));
      return () => playMusic('menu');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const frame = useSharedValue<RenderFrame>(buildFrame(initial, character.visual.body));
  const shake = useSharedValue(0);
  const ambientPts = useSharedValue<Point[]>(NO_POINTS);
  const impactPts = useSharedValue<Point[]>(NO_POINTS);
  const hurtPts = useSharedValue<Point[]>(NO_POINTS);

  const transform = useDerivedValue(() => [
    { translateX: offX + shake.value * scale },
    { translateY: offY },
    { scale },
  ]);
  const pHpW = useDerivedValue(() => frame.value.playerHp * 200);
  const eHpW = useDerivedValue(() => frame.value.enemyHp * 200);
  const enW = useDerivedValue(() => frame.value.energy * 120);
  const enColor = useDerivedValue(() => (frame.value.energy >= 0.5 ? '#35d0ff' : '#2a6f8a'));
  const bossW = useDerivedValue(() => Math.max(0, frame.value.bossHp) * 280);
  const bossOn = useDerivedValue(() => (frame.value.bossHp >= 0 ? 1 : 0));

  const sync = useCallback(() => {
    const a = arena.current;
    frame.value = buildFrame(a, character.visual.body);
    shake.value = a.shake > 0 ? Math.sin(a.time * 90) * a.shake : 0;

    const ps = a.particles;
    if (ps.ambientActive > 0) ambientPts.value = pointsOf(ps.ambient, ps.ambientActive);
    if (ps.impact.cap > 0) {
      impactPts.value = pointsOf(ps.impact);
      hurtPts.value = pointsOf(ps.hurt);
    }

    if (a.events.length > 0) {
      for (const ev of a.events) { playSfx(ev); if (vibrationRef.current) buzz(ev); }
      a.events.length = 0;
    }

    const next = readHud(a); // React state only changes when something visible changes (rare)
    if (!sameHud(lastHud.current, next)) { lastHud.current = next; setHud(next); }
    if (a.over && !shown.current) { shown.current = true; onOver.current(a); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSync = 0;
    let lastPerf = last;
    let acc = 0;
    const loop = (now: number) => {
      const ms = now - last;
      const dt = Math.min(ms / 1000, 0.1);
      last = now;
      if (SHOW_PERF && !paused.current) {
        frameStats.current.add(ms);
        if (now - lastPerf >= 1000) {
          lastPerf = now;
          const s = frameStats.current.summary();
          setPerfTxt(`${s.fps.toFixed(0)} fps · avg ${s.avgMs.toFixed(1)}ms · p95 ${s.p95Ms.toFixed(1)}ms · worst ${s.worstMs.toFixed(0)}ms · ${qualityRef.current}`);
        }
      }
      if (!paused.current && !arena.current.over) {
        acc += dt;
        while (acc >= FIXED_DT) {
          stepArena(arena.current, input.current, FIXED_DT);
          const i = input.current; // one-shot buttons are consumed after the first sub-step
          i.light = i.heavy = i.jump = i.dodge = i.special = false;
          acc -= FIXED_DT;
        }
        if (governorRef.current.sample(ms)) onDowngrade.current();
      }
      if (now - lastSync >= minInterval.current) { lastSync = now; sync(); } // 30 FPS option skips frames
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sync]);

  const startFight = () => { paused.current = false; setIntro(false); };

  const retry = () => {
    arena.current = makeArena(cfg, qualityRef.current, perks);
    input.current = emptyInput();
    shown.current = false;
    paused.current = false;
    lastHud.current = readHud(arena.current);
    setHud(lastHud.current);
    setSummary(null);
    setIsPaused(false);
    setResult(null);
  };

  const hold = (k: Held) => ({
    onPressIn: () => { input.current[k] = true; },
    onPressOut: () => { input.current[k] = false; },
  });
  const tap = (k: OneShot) => ({ onPressIn: () => { input.current[k] = true; } });

  const onStick = (dx: number, dy: number) => {
    const r = joystickToInput(dx, dy, jumpHeld.current);
    jumpHeld.current = r.jumpHeld;
    const i = input.current;
    i.left = r.left; i.right = r.right; i.block = r.block;
    if (r.jump) i.jump = true;
  };

  const togglePause = () => {
    if (intro) return;
    paused.current = !paused.current;
    input.current = emptyInput();
    setIsPaused(paused.current);
  };

  const nextTarget = useMemo(() => {
    if (params.mode !== 'level' || challenge) return null;
    if (params.level < 100) return { world: params.world, level: params.level + 1 };
    return params.world < 5 ? { world: params.world + 1, level: 1 } : null;
  }, [params, challenge]);
  const canNext = result === 'victory' && nextTarget !== null && isLevelUnlocked(save, nextTarget.world, nextTarget.level);

  const kinds = hud.kinds.split(',');
  const ambient = AMBIENT_LOOK[ambientStyleFor(worldIdx)];
  const cs = settings.controlSize;
  const prompt = params.mode === 'tutorial' ? TUTORIAL_STEPS[hud.step]?.prompt : undefined;
  const title = result === 'victory'
    ? (params.mode === 'tutorial' ? 'TUTORIAL COMPLETE' : 'VICTORY')
    : result === 'defeat' ? 'DEFEAT' : 'PAUSED';
  const r = summary?.reward;
  const introName = bossInfo
    ? (cfg?.miniBoss ? `CHAMPION OF ${bossInfo.name.toUpperCase()}` : bossInfo.name.toUpperCase())
    : '';

  return (
    <View style={styles.root}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={transform}>
          {/* PLACEHOLDER ART: flat shapes and polygon silhouettes tinted with the world palette */}
          <Rect x={0} y={0} width={WORLD_W} height={WORLD_H} color={palette.sky} />
          <Circle cx={650} cy={70} r={38} color={palette.moon} opacity={0.85} />
          <Background world={worldDef} layers={preset.parallax} fog={preset.fog} frame={frame} />
          <Rect x={0} y={GROUND_Y} width={WORLD_W} height={WORLD_H - GROUND_Y} color={palette.ground} />

          {preset.ambient > 0 && (
            <Points points={ambientPts} mode="points" color={ambient.color} style="stroke"
                    strokeWidth={ambient.size} strokeCap="square" opacity={ambient.opacity} />
          )}

          {HAZARD_SLOTS.map((i) => <HazardView key={i} frame={frame} index={i} />)}
          {ENEMY_SLOTS.map((i) => {
            const kind = (kinds[i] || 'melee') as EnemyKind;
            return (
              <FighterView key={`${i}-${kind}`} frame={frame} who={i} glow={preset.glow}
                           look={enemyLookFor(kind, worldIdx)} weapon={enemyWeaponFor(kind)} />
            );
          })}
          <FighterView frame={frame} who="player" look={character.visual} weapon={weapon.visual} glow={preset.glow} />
          {preset.hitFx && <HitFxView frame={frame} style={weapon.visual.hitFx} color={weapon.visual.hitColor} />}
          {PROJECTILE_SLOTS.map((i) => <ProjectileView key={i} frame={frame} index={i} />)}

          <Points points={impactPts} mode="points" color={weapon.visual.hitColor} style="stroke"
                  strokeWidth={3} strokeCap="square" />
          <Points points={hurtPts} mode="points" color="#ff4d5e" style="stroke"
                  strokeWidth={3} strokeCap="square" />

          <Circle cx={24} cy={26} r={17} color={character.visual.body} />
          <Circle cx={24} cy={26} r={17} color={character.visual.accent} style="stroke" strokeWidth={2} />
          <Rect x={48} y={14} width={200} height={10} color="#222" />
          <Rect x={48} y={14} width={pHpW} height={10} color="#4cd964" />
          <Rect x={48} y={28} width={120} height={6} color="#222" />
          <Rect x={48} y={28} width={enW} height={6} color={enColor} />
          <Circle cx={776} cy={26} r={17} color="#b3263e" />
          <Circle cx={776} cy={26} r={17} color="#ff8a9a" style="stroke" strokeWidth={2} />
          <Rect x={552} y={14} width={200} height={10} color="#222" />
          <Rect x={552} y={14} width={eHpW} height={10} color="#e0334c" />
          <Rect x={260} y={42} width={280} height={8} color="#222" opacity={bossOn} />
          <Rect x={260} y={42} width={bossW} height={8} color="#ff8c1a" opacity={bossOn} />
        </Group>
      </Canvas>

      {cfg && (
        <>
          <Text style={styles.wave}>{challenge ? 'CHALLENGE · ' : ''}{cfg.id.toUpperCase()}  WAVE {hud.wave}/{cfg.waves.length}</Text>
          <Text style={styles.objective}>★ {cfg.objective.label}</Text>
        </>
      )}
      {hud.boss !== '' && <Text style={styles.bossName}>{hud.boss}</Text>}
      {hud.combo >= 2 && <Text style={styles.combo}>{hud.combo} HIT COMBO</Text>}
      {prompt && (
        <View style={styles.prompt}>
          <Text style={styles.promptTxt}>{hud.step + 1}/{TUTORIAL_STEPS.length}  {prompt}</Text>
        </View>
      )}
      {!!toast && <View style={styles.toast}><Text style={styles.toastTxt}>{toast}</Text></View>}


      {SHOW_PERF && !!perfTxt && <Text style={styles.perf}>{perfTxt}</Text>}

            {settings.controls === 'joystick' ? (
        <View style={[styles.cluster, { left: 24 }]}>
          <Joystick size={Math.round(124 * cs)} onChange={onStick} />
        </View>
      ) : (
        <View style={[styles.cluster, { left: 24, flexDirection: 'row' }]}>
          <Btn label="◀" size={64 * cs} {...hold('left')} />
          <Btn label="▶" size={64 * cs} {...hold('right')} />
        </View>
      )}
      {cfg && (
        <View style={[styles.badge, { left: width / 2 + 38 }]}>
          <Text style={styles.badgeTxt}>{cfg.level}</Text>
        </View>
      )}
      <View style={[styles.cluster, { right: 24 }]}>
        <View style={styles.row}>
          <Btn label="BLOCK" size={54 * cs} {...hold('block')} />
          <Btn label="DODGE" size={54 * cs} {...tap('dodge')} />
          <Btn label="JUMP" size={54 * cs} {...tap('jump')} />
        </View>
        <View style={styles.row}>
          <Btn label="SPECIAL" size={64 * cs} {...tap('special')} />
          <Btn label="HEAVY" size={76 * cs} {...tap('heavy')} />
          <Btn label="ATK" size={76 * cs} {...tap('light')} />
        </View>
      </View>

      <Pressable style={styles.pause} onPress={togglePause}>
        <Text style={styles.pauseTxt}>{isPaused ? '▶' : 'II'}</Text>
      </Pressable>

      {intro && bossInfo && (
        <Pressable style={styles.intro} onPress={startFight}>
          <Text style={styles.introTag}>{cfg?.worldBoss ? 'WORLD BOSS' : 'MINI-BOSS'}</Text>
          <Text style={[styles.introName, { color: palette.accent }]}>{introName}</Text>
          <Text style={styles.introTitle}>{bossInfo.title}</Text>
          <Text style={styles.introBlurb}>{bossInfo.blurb}</Text>
          <Text style={styles.introBlurb}>
            {cfg?.miniBoss ? 2 : bossInfo.phases.length} phases · wait for the yellow flash, then dodge or block
          </Text>
          <Text style={styles.introTap}>TAP TO FIGHT</Text>
        </Pressable>
      )}

            {isPaused && !result && (
        <PauseMenu
          onResume={togglePause}
          onRestart={retry}
          onSettings={() => navigation.navigate('Settings')}
          onMenu={() => navigation.navigate('Home')}
        />
      )}
      {result === 'victory' && (
        <VictoryPanel
          title={title}
          stars={summary?.stars}
          score={summary?.score}
          objectiveMet={summary?.objectiveMet}
          reward={summary?.reward ?? null}
          onNext={canNext && nextTarget
            ? () => navigation.replace('Arena', { mode: 'level', world: nextTarget.world, level: nextTarget.level })
            : undefined}
          onRetry={retry}
          onExit={() => navigation.goBack()}
          exitLabel={cfg ? 'LEVELS' : 'HOME'}
          xp={summary?.xp}
          levelUp={summary?.levelUp}
        />
      )}
      {result === 'defeat' && (
        <DefeatPanel onRetry={retry} onExit={() => navigation.goBack()} exitLabel={cfg ? 'LEVELS' : 'HOME'} />
      )}
    </View>
  );
}

function Btn(props: { label: string; size: number; onPressIn: () => void; onPressOut?: () => void }) {
  const s = Math.round(props.size);
  return (
    <Pressable
      onPressIn={props.onPressIn}
      onPressOut={props.onPressOut}
      style={({ pressed }) => [styles.btn, { width: s, height: s, borderRadius: s / 2 }, pressed && styles.btnDown]}
    >
      <Text style={styles.btnTxt}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  cluster: { position: 'absolute', bottom: 12, gap: 8, alignItems: 'flex-end' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  btn: {
    backgroundColor: 'rgba(122,44,255,0.35)', borderWidth: 2, borderColor: 'rgba(191,163,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDown: { backgroundColor: 'rgba(122,44,255,0.8)' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 11 },
  pause: { position: 'absolute', top: 8, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  pauseTxt: { color: '#fff', fontWeight: '800' },
  wave: { position: 'absolute', top: 40, right: 24, color: '#fff', fontWeight: '800', letterSpacing: 1, fontSize: 11 },
  objective: { position: 'absolute', top: 56, right: 24, color: '#ffd24a', fontWeight: '700', fontSize: 11 },
  bossName: { position: 'absolute', top: 54, alignSelf: 'center', color: '#ffb36b', fontWeight: '900', letterSpacing: 2, fontSize: 12 },
  combo: { position: 'absolute', top: 76, right: 24, color: '#ffd24a', fontSize: 22, fontWeight: '900' },
  prompt: { position: 'absolute', top: 44, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  promptTxt: { color: '#fff', fontWeight: '700' },
  toast: { position: 'absolute', top: 76, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  toastTxt: { color: '#ffd24a', fontWeight: '700', fontSize: 11 },
  intro: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 40 },
  introTag: { color: '#ff5566', fontWeight: '900', letterSpacing: 6, fontSize: 12 },
  introName: { fontWeight: '900', letterSpacing: 4, fontSize: 30, textAlign: 'center' },
  introTitle: { color: '#e8e8f5', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
  introBlurb: { color: '#aab', fontSize: 12, textAlign: 'center' },
  introTap: { color: '#fff', fontWeight: '900', letterSpacing: 5, marginTop: 14 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  overTitle: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: 5 },
  summary: { alignItems: 'center', gap: 2 },
  stars: { color: '#ffd24a', fontSize: 30 },
  sumTxt: { color: '#dde', fontWeight: '700' },
  coinTxt: { color: '#ffd24a', fontWeight: '800' },
  menuRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  menuBtn: { backgroundColor: '#7a2cff', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 8 },
  menuTxt: { color: '#fff', fontWeight: '800', letterSpacing: 3 },
  perf: { position: 'absolute', top: 70, left: 24, color: '#7fff9f', fontSize: 10, fontWeight: '700' },
  badge: { position: 'absolute', top: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: '#f5a623', alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { color: '#1b1206', fontWeight: '900', fontSize: 12 },
});