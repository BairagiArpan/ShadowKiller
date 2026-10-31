import { createArena, stepArena } from '../engine/arena';
import { FIXED_DT } from '../engine/constants';
import type { Perks } from '../engine/perks';
import { applyChallenge, getLevel, getWorldLevels } from '../levels';
import { WORLD_COUNT, tierOf } from '../levels/common';
import type { LevelConfig } from '../levels/types';
import { SKILLS, spentPoints } from '../skills/catalog';
import { perksFor } from '../skills/progress';
import { pointsFor, xpFromCoins } from '../skills/xp';
import { BotStyle, botInput, createBot } from './bot';

export interface RunResult { won: boolean; timedOut: boolean; time: number; hpFraction: number }
export interface Row { world: number; level: number; winRate: number; avgTime: number; avgHp: number; timeouts: number }

export const SAMPLE_LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 85, 90, 95, 99, 100];

/** The order a sensible player spends skill points in. */
const PRIORITY = ['keen_edge', 'vitality', 'focus', 'surge', 'power', 'guard', 'evasion'];

/**
 * Skills a player would realistically have on reaching this level: first-clear coins from every
 * earlier level, turned into XP and spent in PRIORITY order. This slightly underestimates a real
 * player, who also earns star bonuses and replay coins.
 */
export function buildAt(world: number, level: number): Record<string, number> {
  let coins = 0;
  for (let w = 1; w <= world; w++) {
    const lv = getWorldLevels(w);
    const upTo = w < world ? lv.length : level - 1;
    for (let k = 0; k < upTo; k++) coins += lv[k].baseReward;
  }
  let pts = pointsFor(xpFromCoins(coins));
  const ranks: Record<string, number> = {};
  for (const id of PRIORITY) {
    const max = SKILLS.find((s) => s.id === id)!.maxRank;
    const n = Math.min(max, pts);
    if (n > 0) { ranks[id] = n; pts -= n; }
  }
  return ranks;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One full run of a level by a bot. Deterministic for a given seed. A run that lasts too long counts as a loss. */
export function runLevel(
  cfg: LevelConfig, style: BotStyle, perks: Perks | undefined, seed: number, maxSeconds = 240,
): RunResult {
  const a = createArena({
    waves: cfg.waves, scaling: cfg.scaling, hazards: cfg.hazards, healPerWave: cfg.healPerWave,
    world: cfg.world, miniBoss: cfg.miniBoss, perks,
  }, mulberry(seed));
  const bot = createBot(style, mulberry(seed ^ 0x9e3779b9));
  const steps = Math.round(maxSeconds / FIXED_DT);
  for (let n = 0; n < steps && !a.over; n++) {
    stepArena(a, botInput(bot, a, FIXED_DT), FIXED_DT);
    a.events.length = 0; // nobody listens to audio events here
  }
  return {
    won: a.over === 'victory', timedOut: a.over === null,
    time: a.time, hpFraction: Math.max(0, a.player.hp / a.player.maxHp),
  };
}

export function sample(
  world: number, level: number, style: BotStyle, ranks: Record<string, number> | null,
  runs: number, challenge = false,
): Row {
  const base = getLevel(world, level);
  const cfg = challenge ? applyChallenge(base) : base;
  const perks = ranks ? perksFor(ranks) : undefined;
  let wins = 0; let time = 0; let hp = 0; let timeouts = 0;
  for (let r = 0; r < runs; r++) {
    const res = runLevel(cfg, style, perks, world * 1000 + level * 10 + r + 1);
    time += res.time;
    if (res.won) { wins += 1; hp += res.hpFraction; }
    if (res.timedOut) timeouts += 1;
  }
  return { world, level, winRate: wins / runs, avgTime: time / runs, avgHp: wins > 0 ? hp / wins : 0, timeouts };
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;

export function buildReport(runs: number): string {
  const out: string[] = [
    '# SHADOW KILLER balance report',
    '',
    `Each cell is the share of ${runs} bot runs that won. The bot dodges at the last moment, blocks, never jumps,`,
    'and notices wind-ups with a fixed probability (average 65%, expert 90%). Read the numbers as RELATIVE signals.',
    'Look for cliffs, flat spots and impossible levels, not exact percentages. A real player will do better or worse in different places.',
    '"Skills" means the points a player would realistically have by that level (first-clear coins only).',
    '',
  ];
  const flags: string[] = [];

  for (let w = 1; w <= WORLD_COUNT; w++) {
    out.push(`## World ${w}`, '', '| Level | Tier | Average bot | Expert bot | Expert + skills | Expert avg time | Notes |', '|---|---|---|---|---|---|---|');
    let prev = -1;
    for (const lv of SAMPLE_LEVELS) {
      const ranks = buildAt(w, lv);
      const avg = sample(w, lv, 'average', null, runs);
      const exp = sample(w, lv, 'expert', null, runs);
      const skl = sample(w, lv, 'expert', ranks, runs);
      const notes: string[] = [];
      if (prev >= 0 && prev - exp.winRate >= 0.5) notes.push('cliff');
      if (exp.winRate === 0 && skl.winRate === 0) notes.push('bot never wins');
      if (exp.timeouts > 0) notes.push(`${exp.timeouts} timeouts`);
      if (skl.winRate - exp.winRate >= 0.4) notes.push('skills decide this level');
      if (lv <= 20 && avg.winRate < 0.8) notes.push('easy level is hard');
      if (lv >= 60 && avg.winRate === 1 && exp.winRate === 1) notes.push('too easy?');
      if (exp.winRate < avg.winRate - 0.3) notes.push('expert worse than average (bot problem?)');
      notes.forEach((n) => flags.push(`W${w} L${lv}: ${n}`));
      out.push(`| ${lv} | ${tierOf(lv)} | ${pct(avg.winRate)} | ${pct(exp.winRate)} | ${pct(skl.winRate)} (${spentPoints(ranks)} pts) | ${Math.round(exp.avgTime)}s | ${notes.join(', ')} |`);
      prev = exp.winRate;
    }
    out.push('');
  }

  out.push('## Challenge mode (expert bot, no skills)', '', '| Level | Normal | Challenge |', '|---|---|---|');
  for (const [w, lv] of [[1, 10], [2, 40], [3, 60], [4, 80], [5, 50], [5, 100]]) {
    out.push(`| W${w} L${lv} | ${pct(sample(w, lv, 'expert', null, runs).winRate)} | ${pct(sample(w, lv, 'expert', null, runs, true).winRate)} |`);
  }

  out.push('', '## Dodge-spam check', '',
    'A bot that only mashes DODGE and attack. If this wins late levels often, mashing dodge is an exploit.', '',
    '| Level | Dodge-spam bot | Expert bot |', '|---|---|---|');
  for (const [w, lv] of [[1, 40], [3, 60], [5, 50], [5, 100]]) {
    const spam = sample(w, lv, 'dodgespam', null, runs);
    const exp = sample(w, lv, 'expert', null, runs);
    if (spam.winRate >= 0.5 && spam.winRate > exp.winRate) flags.push(`W${w} L${lv}: dodge-spam beats the normal bot`);
    out.push(`| W${w} L${lv} | ${pct(spam.winRate)} | ${pct(exp.winRate)} |`);
  }

  out.push('', '## Flags', '', flags.length ? flags.map((f) => `- ${f}`).join('\n') : '- none');
  return out.join('\n');
}