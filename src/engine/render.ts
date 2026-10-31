import { PLAYER_ATTACKS, attackHitbox } from './combat';
import { defOf, enemyAttackDef } from './enemies';
import {
  FIGHTER_H, FX_TIME, MAX_ENEMIES, MAX_ENERGY, MAX_HAZARDS, MAX_PROJECTILES, SPECIAL,
} from './constants';
import { HAZARD_BASE, hazardPhase } from './hazards';
import { poseFor } from './pose';
import type { Arena, Fighter } from './types';
import type { AttackDef } from './combat';

/** Plain data the renderer needs each frame. No Skia/React imports here. */
export interface FighterFrame {
  x: number; y: number; facing: number; lean: number; weapon: number; squash: number;
  opacity: number; warn: number; visible: number; color: string;
  slashX: number; slashY: number; slashW: number; slashOn: number;
}
export interface ProjectileFrame { x: number; y: number; on: number }
export interface HazardFrame { x: number; w: number; opacity: number; color: string; on: number }
export interface RenderFrame {
  player: FighterFrame;
  enemies: FighterFrame[];         // always MAX_ENEMIES long
  projectiles: ProjectileFrame[];  // always MAX_PROJECTILES long
  hazards: HazardFrame[];          // always MAX_HAZARDS long
  fx: { x: number; y: number; k: number; on: number };
  playerHp: number; energy: number; enemyHp: number; // 0..1
  bossHp: number;                  // 0..1, or -1 when no boss is alive
}

const HIDDEN: FighterFrame = {
  x: 0, y: 0, facing: 1, lean: 0, weapon: 0, squash: 1, opacity: 0, warn: 0, visible: 0,
  color: '#000000', slashX: 0, slashY: 0, slashW: 0, slashOn: 0,
};
const HIDDEN_HAZARD: HazardFrame = { x: 0, w: 0, opacity: 0, color: '#000000', on: 0 };

function frameOf(
  f: Fighter, def: AttackDef | null, color: string, warn: boolean,
  slash: { x: number; w: number; on: number } | null,
): FighterFrame {
  const pose = poseFor(f, def);
  return {
    x: f.x, y: f.y, facing: f.facing, lean: pose.lean, weapon: pose.weapon, squash: pose.squash,
    opacity: f.state === 'dead' ? 0.35 : f.invuln > 0 ? 0.5 : 1,
    warn: warn ? 1 : 0, visible: 1,
    color: f.state === 'hurt' ? '#ffffff' : color,
    slashX: slash?.x ?? 0, slashY: f.y - FIGHTER_H * 0.8, slashW: slash?.w ?? 0, slashOn: slash?.on ?? 0,
  };
}

export function buildFrame(a: Arena, playerColor = '#7a2cff'): RenderFrame {
  const p = a.player;
  const pdef = p.state === 'attack' && p.attackKind ? PLAYER_ATTACKS[p.attackKind] : null;
  let pslash: { x: number; w: number; on: number } | null = null;
  if (pdef) {
    const b = attackHitbox(p, { ...pdef, reach: pdef.reach * a.perks.reach });
    if (b) pslash = { x: b.x, w: b.w, on: 0.8 };
  } else if (p.state === 'special' && p.t < 0.3) {
    pslash = { x: p.x - SPECIAL.radius, w: SPECIAL.radius * 2, on: 0.35 };
  }

  const enemies: FighterFrame[] = [];
  let hp = 0, maxHp = 0, bossHp = -1;
  for (let i = 0; i < MAX_ENEMIES; i++) {
    const e = a.enemies[i];
    if (!e) { enemies.push(HIDDEN); continue; }
    const d = defOf(e);
    const def = enemyAttackDef(d);
    const box = d.style === 'shot' ? null : attackHitbox(e, def);
    enemies.push(frameOf(e, def, d.color, e.state === 'telegraph',
      box ? { x: box.x, w: box.w, on: 0.8 } : null));
    hp += e.hp; maxHp += e.maxHp;
    if (e.boss && e.state !== 'dead') bossHp = e.hp / e.maxHp;
  }

  const projectiles = [];
  for (let i = 0; i < MAX_PROJECTILES; i++) {
    const pr = a.projectiles[i];
    projectiles.push(pr ? { x: pr.x, y: pr.y, on: 1 } : { x: 0, y: 0, on: 0 });
  }

  const hazards: HazardFrame[] = [];
  for (let i = 0; i < MAX_HAZARDS; i++) {
    const h = a.hazards[i];
    if (!h) { hazards.push(HIDDEN_HAZARD); continue; }
    const phase = hazardPhase(h, a.time);
    let opacity = 0.18;                                       // dormant: faint marking
    if (h.kind === 'ice') opacity = 0.5;
    else if (phase === 2) opacity = 0.95;                     // active: bright and solid
    else if (phase === 1) opacity = Math.floor(a.time * 8) % 2 === 0 ? 0.7 : 0.25; // warning: blinks
    hazards.push({ x: h.x, w: h.w, opacity, color: HAZARD_BASE[h.kind].color, on: 1 });
  }

  return {
    player: frameOf(p, pdef, playerColor, false, pslash),
    enemies, projectiles, hazards,
    fx: a.fx.on
      ? { x: a.fx.x, y: a.fx.y, k: Math.min(1, a.fx.age / FX_TIME), on: 1 }
      : { x: 0, y: 0, k: 1, on: 0 },
    playerHp: p.hp / p.maxHp,
    energy: a.energy / MAX_ENERGY,
    enemyHp: maxHp > 0 ? hp / maxHp : 0,
    bossHp,
  };
}