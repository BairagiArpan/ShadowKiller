import { emptyInput, nearestEnemy } from '../engine/arena';
import { FIGHTER_W } from '../engine/constants';
import { defOf } from '../engine/enemies';
import { hazardPhase } from '../engine/hazards';
import { specialCostFor } from '../engine/perks';
import type { Arena, Enemy, Input } from '../engine/types';

/**
 * 'novice', 'average' and 'expert' differ only in how often they spot a telegraph in time.
 * 'dodgespam' mashes dodge and attack, to check that mashing dodge is not a winning strategy.
 */
export type BotStyle = 'novice' | 'average' | 'expert' | 'dodgespam';
export const REACT: Record<BotStyle, number> = { novice: 0.35, average: 0.65, expert: 0.9, dodgespam: 1 };

export interface Bot {
  style: BotStyle;
  rng: () => number;
  telegraphs: WeakMap<Enemy, { lastT: number; ok: boolean }>;
  shots: WeakMap<object, boolean>;
  sinceLight: number;
  sinceHeavy: number;
}

export function createBot(style: BotStyle, rng: () => number): Bot {
  return { style, rng, telegraphs: new WeakMap(), shots: new WeakMap(), sinceLight: 1, sinceHeavy: 1 };
}

/**
 * A simple fighter: it leaves hazard zones, dodges at the last moment when it spots a wind-up (and
 * blocks if dodge is on cooldown), blocks briefly before that, otherwise walks up and attacks,
 * punishes enemy recovery with heavy hits, and uses the special against groups, armored enemies and
 * bosses. It never jumps. Noticing more wind-ups makes it safer, never passive: it keeps attacking
 * between threats. Read results as relative signals, not exact numbers.
 */
export function botInput(bot: Bot, a: Arena, dt: number): Input {
  const i = emptyInput();
  const p = a.player;
  if (p.state === 'dead') return i;
  bot.sinceLight += dt;
  bot.sinceHeavy += dt;
  const target = nearestEnemy(a);
  if (!target) return i;
  const dist = Math.abs(target.x - p.x);

  if (bot.style === 'dodgespam') {
    i.dodge = true;
    if (dist < 85) i.light = true;
    else if (target.x > p.x) i.right = true;
    else i.left = true;
    return i;
  }
  const react = REACT[bot.style];
  const canDodge = a.dodgeCd <= 0.02;

  // Leave a hazard zone as soon as it starts warning.
  for (const h of a.hazards) {
    if (h.kind === 'ice' || hazardPhase(h, a.time) === 0) continue;
    if (p.x > h.x - 25 && p.x < h.x + h.w + 25) {
      if (p.x < h.x + h.w / 2) i.left = true; else i.right = true;
      return i;
    }
  }

  // Incoming melee or dash strike: decide once per telegraph whether we notice it.
  let dodgeNow = false;
  let blockNow = false;
  for (const e of a.enemies) {
    if (e.state !== 'telegraph') continue;
    const d = defOf(e);
    if (d.style === 'shot') continue;
    const range = d.style === 'dash' ? d.attackRange + 60 : d.reach + FIGHTER_W + 25;
    if (Math.abs(e.x - p.x) > range) continue;
    let mem = bot.telegraphs.get(e);
    if (!mem || e.t < mem.lastT) mem = { lastT: e.t, ok: bot.rng() < react }; // a new telegraph resets e.t
    mem.lastT = e.t;
    bot.telegraphs.set(e, mem);
    if (!mem.ok) continue;
    const left = e.teleTime - e.t;
    if (left <= 0.12) { if (canDodge) dodgeNow = true; else blockNow = true; }
    else if (left <= 0.3) blockNow = true;
  }

  // Incoming projectile.
  for (const pr of a.projectiles) {
    if (Math.sign(pr.vx) !== Math.sign(p.x - pr.x) || Math.abs(p.x - pr.x) > 90) continue;
    let ok = bot.shots.get(pr);
    if (ok === undefined) { ok = bot.rng() < react; bot.shots.set(pr, ok); }
    if (ok) { if (canDodge) dodgeNow = true; else blockNow = true; }
  }

  if (dodgeNow) { i.dodge = true; return i; }
  if (blockNow) { i.block = true; return i; }

  const near = a.enemies.filter((e) => e.state !== 'dead' && Math.abs(e.x - p.x) < 150).length;
  if (a.energy >= specialCostFor(a.perks) && (near >= 2 || defOf(target).armored || target.boss)) {
    i.special = true;
    return i;
  }
  if (dist > 78) {
    if (target.x > p.x) i.right = true; else i.left = true;
    return i;
  }
  if (target.state === 'recovery' && p.state !== 'attack' && bot.sinceHeavy >= 0.5) {
    i.heavy = true; bot.sinceHeavy = 0;
  } else if (bot.sinceLight >= 0.12) {
    i.light = true; bot.sinceLight = 0;
  }
  return i;
}