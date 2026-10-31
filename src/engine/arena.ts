import {
  BUFFER_TIME, COMBO_WINDOW, DODGE_SPEED, DODGE_TIME, ENEMY_BLOCK_TIME, ENEMY_HIT_INVULN,
  ENEMY_HURT_TIME, ENERGY_GAIN, ENERGY_ON_BLOCK, FIGHTER_H, FIGHTER_W, FIXED_DT, FX_TIME, GRAVITY,
  GROUND_Y, HITSTOP, HURT_TIME, ICE_GRIP, JUMP_VELOCITY, MAX_ENEMIES, MAX_ENERGY, MAX_EVENTS,
  MAX_PROJECTILES, MOVE_SPEED, PLAYER_MAX_HP, PROJECTILE_H, PROJECTILE_W, PROJECTILE_Y, ROAR_TIME,
  SPECIAL, SPECIAL_COST, WAVE_DELAY, WORLD_W,DODGE_COOLDOWN,
} from './constants';
import {
  PLAYER_ATTACKS, applyHit, attackDuration, attackHitbox, comboMultiplier, createFighter,
  hurtbox, nextLight, rectsOverlap,
} from './combat';
import {
  EnemyDef, NO_SCALING, createEnemy, defOf, enemyAttackDef, enemyDamage, telegraphFor,
} from './enemies';
import { BOSSES, advanceMove, buildBossDef, initBoss, phaseFor } from './bosses';
import { AmbientStyle, createParticles, emitHurt, emitImpact, stepParticles } from './particles';
import { hazardBox, hazardPhase, isOnIce } from './hazards';
import { enterTutorialStep, updateTutorial } from './tutorial';
import {
  Arena, AttackKind, BossState, Enemy, EnemyKind, EnemyScaling, Fighter, FighterState, GameEvent,
  Hazard, HitResult, Input, Stats,
} from './types';
import { NO_PERKS, Perks, specialCostFor } from './perks';

export interface ArenaSpec {
  waves: EnemyKind[][];
  tutorial?: boolean;
  scaling?: EnemyScaling;
  hazards?: Hazard[];
  healPerWave?: number;
  world?: number;      // enables per-world boss scripting (1..5)
  miniBoss?: boolean;
  particles?: { style: AmbientStyle; ambient: number; impactCap: number; perHit: number };
  perks?: Perks;
}

export function emptyInput(): Input {
  return { left: false, right: false, block: false, jump: false, light: false, heavy: false, dodge: false, special: false };
}

export function emptyStats(): Stats {
  return { distance: 0, jumps: 0, hits: 0, heavyHits: 0, chain3: 0, blocks: 0, dodges: 0, specials: 0, kills: 0, maxCombo: 0 };
}

function emit(a: Arena, ev: GameEvent): void {
  if (a.events.length < MAX_EVENTS) a.events.push(ev);
}

function finish(a: Arena, r: 'victory' | 'defeat'): void {
  a.over = r;
  emit(a, r);
}

export function createArena(
  spec: ArenaSpec = { waves: [['melee']] },
  rng: () => number = Math.random,
): Arena {
  const fx = spec.particles;
  const a: Arena = {
    player: createFighter(200, 1, PLAYER_MAX_HP + (spec.perks?.maxHp ?? 0)),
    enemies: [], projectiles: [],
    hazards: (spec.hazards ?? []).map((h) => ({ ...h })),
    scaling: spec.scaling ?? NO_SCALING,
    healPerWave: spec.healPerWave ?? 0,
    waves: spec.waves.map((w) => [...w]), wave: 0, waveClearedAt: null,
    energy: 0, combo: { count: 0, timer: 0 },
    buffer: { light: 0, heavy: 0, dodge: 0, special: 0 },
    swing: 0, stats: emptyStats(), passive: false, tutorial: null,
    time: 0, shake: 0, hitstop: 0, over: null, rng,
    fx: { x: 0, y: 0, age: 0, on: false },
    world: spec.world ?? 0, miniBoss: spec.miniBoss ?? false,
    particles: createParticles(fx?.style ?? 'motes', fx?.ambient ?? 0, fx?.impactCap ?? 0, fx?.perHit ?? 0),
    events: [],
    perks: spec.perks ?? NO_PERKS,
    dodgeCd: 0,
  };
  if (spec.tutorial) {
    a.enemies = [createEnemy('melee', 620, 0, 500)]; // training dummy with lots of HP
    a.tutorial = { index: 0, base: emptyStats(), done: false };
    enterTutorialStep(a);
  } else {
    spawnNextWave(a);
  }
  return a;
}

function spawnNextWave(a: Arena): boolean {
  const kinds = a.waves.shift();
  if (!kinds) return false;
  a.enemies = kinds.slice(0, MAX_ENEMIES).map((k, i) => {
    const e = createEnemy(k, WORLD_W - 40 - i * 60, i * 1.3, undefined, a.scaling);
    if (k === 'boss' && a.world > 0) e.boss = initBoss(a.world, a.miniBoss);
    return e;
  });
  a.projectiles = [];
  a.wave += 1;
  return true;
}

const FRICTION_STATES = new Set<FighterState>(['hurt', 'attack', 'block', 'dead', 'recovery', 'telegraph', 'special']);

function integrate(f: Fighter, dt: number, friction = true): void {
  if (friction && FRICTION_STATES.has(f.state)) f.vx *= Math.pow(0.001, dt);
  f.x += f.vx * dt;
  f.vy += GRAVITY * dt;
  f.y += f.vy * dt;
  if (f.y >= GROUND_Y) { f.y = GROUND_Y; f.vy = 0; }
  f.x = Math.min(WORLD_W - FIGHTER_W / 2, Math.max(FIGHTER_W / 2, f.x));
}

function go(f: Fighter, s: FighterState): void { f.state = s; f.t = 0; }

export function nearestEnemy(a: Arena): Enemy | null {
  let best: Enemy | null = null;
  for (const e of a.enemies) {
    if (e.state === 'dead') continue;
    if (!best || Math.abs(e.x - a.player.x) < Math.abs(best.x - a.player.x)) best = e;
  }
  return best;
}

function startAttack(a: Arena, kind: AttackKind): void {
  const p = a.player;
  a.swing += 1;
  p.state = 'attack'; p.attackKind = kind; p.t = 0; p.hitLanded = false; p.vx = 0;
}

/* ---------------------------- player ---------------------------- */

function updatePlayer(a: Arena, input: Input, dt: number): void {
  const p = a.player; const buf = a.buffer;
  p.t += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  a.dodgeCd = Math.max(0, a.dodgeCd - dt);
  if (p.state === 'dead') { integrate(p, dt); return; }

  const grounded = p.y >= GROUND_Y;
  const target = nearestEnemy(a);
  const toEnemy: 1 | -1 = target ? (target.x >= p.x ? 1 : -1) : p.facing;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  const def = p.state === 'attack' && p.attackKind ? PLAYER_ATTACKS[p.attackKind] : null;
  const recovering = def !== null && p.t >= def.windup + def.active;
  const canCancel = recovering && p.hitLanded && p.attackKind !== 'heavy';
  const free = p.state === 'idle' || p.state === 'walk' || p.state === 'block';
  const x0 = p.x;

  if ((free || recovering) && buf.dodge > 0 && grounded && a.dodgeCd <= 0) {
    buf.dodge = 0;
    a.dodgeCd = DODGE_COOLDOWN;
    p.state = 'dodge'; p.attackKind = null; p.t = 0; p.invuln = DODGE_TIME + a.perks.dodgeInvuln;
    p.vx = (dir || -toEnemy) * DODGE_SPEED;
    emit(a, 'dodge');
    if (a.enemies.some((e) => e.state === 'telegraph' || e.state === 'attack')) a.stats.dodges += 1;
  } else if ((free || canCancel) && buf.special > 0 && a.energy >= specialCostFor(a.perks)) {
    buf.special = 0; a.energy -= specialCostFor(a.perks); a.stats.specials += 1;
    p.state = 'special'; p.attackKind = null; p.t = 0; p.hitLanded = false;
    p.invuln = SPECIAL.duration; p.vx = 0; p.facing = toEnemy;
    emit(a, 'special');
  } else if ((free || canCancel) && buf.heavy > 0) {
    buf.heavy = 0; p.facing = toEnemy; startAttack(a, 'heavy');
  } else if ((free || (canCancel && p.attackKind !== 'light3')) && buf.light > 0) {
    buf.light = 0; p.facing = toEnemy;
    startAttack(a, free ? 'light1' : nextLight(p.attackKind));
  } else if (free) {
    if (input.jump && grounded) { p.vy = -JUMP_VELOCITY; a.stats.jumps += 1; }
    if (input.block && grounded) {
      p.state = 'block'; p.facing = toEnemy; p.vx = 0;
    } else {
      const want = dir * MOVE_SPEED * a.perks.moveSpeed;
      if (grounded && isOnIce(a.hazards, p.x)) p.vx += (want - p.vx) * Math.min(1, ICE_GRIP * dt);
      else p.vx = want;
      if (dir) p.facing = dir > 0 ? 1 : -1;
      p.state = dir ? 'walk' : 'idle';
    }
  }

  if (p.state === 'attack' && p.attackKind) {
    if (p.t >= attackDuration(PLAYER_ATTACKS[p.attackKind])) { p.state = 'idle'; p.attackKind = null; }
  } else if (p.state === 'dodge' && p.t >= DODGE_TIME) {
    p.state = 'idle'; p.vx = 0;
  } else if (p.state === 'special' && p.t >= SPECIAL.duration) {
    p.state = 'idle';
  } else if (p.state === 'hurt' && p.t >= HURT_TIME) {
    p.state = 'idle';
  }

  integrate(p, dt);
  if (p.state === 'walk') a.stats.distance += Math.abs(p.x - x0);
}

/* ----------------------------- bosses ----------------------------- */

/** Fills a dead (or new) slot with a melee minion. Silently skipped when the arena is full. */
function summonMinion(a: Arena, n: number): void {
  const x = a.player.x < WORLD_W / 2 ? WORLD_W - 40 - n * 60 : 40 + n * 60;
  const m = createEnemy('melee', x, n * 1.3 + a.time, undefined, a.scaling);
  const dead = a.enemies.findIndex((e) => e.state === 'dead' && !e.boss);
  if (dead >= 0) a.enemies[dead] = m;
  else if (a.enemies.length < MAX_ENEMIES) a.enemies.push(m);
}

function enterPhase(a: Arena, e: Enemy, phase: number): void {
  const b = e.boss as BossState;
  b.phase = phase; b.moveIdx = 0; b.def = buildBossDef(b.world, phase, 0);
  b.roar = ROAR_TIME;
  e.invuln = Math.max(e.invuln, ROAR_TIME);
  e.cooldown = 0.5; e.strikesLeft = 0; e.hitLanded = true; e.vx = 0;
  go(e, 'recovery');
  a.shake = Math.max(a.shake, 8);
  a.projectiles = [];
  emit(a, 'boss_phase');
  const n = BOSSES[b.world].phases[phase].summon;
  for (let i = 0; i < n; i++) summonMinion(a, i);
}

/** Handles phase changes. Returns true while the boss is roaring (busy and invulnerable). */
function updateBoss(a: Arena, e: Enemy): boolean {
  const b = e.boss;
  if (!b) return false;
  const target = phaseFor(b, e.hp / e.maxHp);
  if (target > b.phase) enterPhase(a, e, target);
  return b.roar > 0;
}

/* ----------------------------- enemies ----------------------------- */

function spawnProjectile(a: Arena, e: Enemy, d: EnemyDef): void {
  if (a.projectiles.length >= MAX_PROJECTILES) return;
  a.projectiles.push({
    x: e.x + e.facing * (FIGHTER_W / 2 + 4), y: e.y - PROJECTILE_Y,
    vx: e.facing * d.projectileSpeed, damage: enemyDamage(e, d), knockback: d.knockback, alive: true,
  });
}

function updateEnemy(a: Arena, e: Enemy, dt: number): void {
  const d = defOf(e);
  const p = a.player;
  e.t += dt;
  e.invuln = Math.max(0, e.invuln - dt);
  e.cooldown = Math.max(0, e.cooldown - dt);
  if (e.state === 'dead') { integrate(e, dt); return; }

  if (updateBoss(a, e)) {
    const b = e.boss as BossState;
    b.roar -= dt;
    e.vx = 0;
    if (b.roar <= 0) go(e, 'approach');
    integrate(e, dt);
    return;
  }

  const dx = p.x - e.x;
  const dist = Math.abs(dx);
  const playerDead = p.state === 'dead';
  if (e.state === 'patrol' || e.state === 'approach' || e.state === 'block') e.facing = dx >= 0 ? 1 : -1;
  if ((a.passive || playerDead) && (e.state === 'approach' || e.state === 'telegraph' || e.state === 'block')) {
    go(e, 'patrol');
  }

  switch (e.state) {
    case 'patrol':
      e.vx = playerDead ? 0 : Math.sin(a.time * 0.8 + e.phase) * 40;
      if (!a.passive && !playerDead && dist < d.aggroRange) go(e, 'approach');
      break;

    case 'approach': {
      if (p.state !== 'attack' && p.state !== 'special') {
        e.guardRolled = false;
      } else if (!e.guardRolled && dist < 130) {
        e.guardRolled = true;
        if (a.rng() < d.blockChance) { go(e, 'block'); e.vx = 0; break; }
      }
      if (dist > d.attackRange) {
        e.vx = e.facing * d.speed * e.spdMul;
      } else {
        const cornered = e.facing === 1 ? e.x <= FIGHTER_W : e.x >= WORLD_W - FIGHTER_W;
        e.vx = d.style === 'shot' && dist < d.keepAway && !cornered ? -e.facing * d.speed * 0.8 * e.spdMul : 0;
        if (e.cooldown <= 0) {
          e.vx = 0; e.strikesLeft = d.strikes; e.teleTime = telegraphFor(e, d, false); go(e, 'telegraph');
        }
      }
      break;
    }

    case 'block':
      e.vx = 0;
      if (e.t >= ENEMY_BLOCK_TIME) go(e, 'approach');
      break;

    case 'telegraph': // facing is locked here so the cue is readable and dodgeable
      if (e.t >= e.teleTime) {
        go(e, 'attack'); e.hitLanded = false;
        if (d.style === 'shot') spawnProjectile(a, e, d);
        if (d.style === 'dash') e.vx = e.facing * d.dashSpeed;
      }
      break;

    case 'attack':
      if (d.style === 'dash') e.vx = e.facing * d.dashSpeed;
      if (e.t >= d.active) {
        e.strikesLeft -= 1;
        if (e.strikesLeft > 0) {
          e.facing = dx >= 0 ? 1 : -1; e.teleTime = telegraphFor(e, d, true); go(e, 'telegraph');
        } else {
          e.cooldown = d.cooldown; e.vx = 0; go(e, 'recovery');
        }
      }
      break;

    case 'recovery':
      if (e.t >= d.recovery) {
        if (e.boss) advanceMove(e.boss); // the next move is chosen only after recovery
        go(e, 'approach');
      }
      break;

    case 'hurt':
      if (e.t >= ENEMY_HURT_TIME) go(e, 'approach');
      break;

    default: break;
  }
  integrate(e, dt, !(d.style === 'dash' && e.state === 'attack'));
}

function separate(a: Arena): void {
  const alive = a.enemies.filter((e) => e.state !== 'dead');
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const gap = alive[j].x - alive[i].x;
      const overlap = FIGHTER_W - Math.abs(gap);
      if (overlap <= 0) continue;
      const s = gap >= 0 ? 1 : -1;
      alive[j].x += (s * overlap) / 2;
      alive[i].x -= (s * overlap) / 2;
    }
  }
  for (const e of alive) e.x = Math.min(WORLD_W - FIGHTER_W / 2, Math.max(FIGHTER_W / 2, e.x));
}

/* ------------------------- hits, projectiles, hazards ------------------------- */

function onPlayerHit(a: Arena, r: HitResult): void {
  if (r === 'ignored') return;
  a.hitstop = HITSTOP;
  if (r === 'hit') {
    a.shake = Math.max(a.shake, 5);
    a.combo.count = 0; a.combo.timer = 0;
    emit(a, 'hurt');
    emitHurt(a.particles, a.player.x, a.player.y - FIGHTER_H * 0.55, a.particles.perHit);
  } else {
    a.shake = Math.max(a.shake, 1);
    a.energy = Math.min(MAX_ENERGY, a.energy + ENERGY_ON_BLOCK);
    a.stats.blocks += 1;
    emit(a, 'blocked');
  }
}

function onEnemyHit(a: Arena, e: Enemy, r: HitResult, kind: AttackKind | 'special'): void {
  if (r === 'ignored') return;
  a.hitstop = HITSTOP;
  if (r === 'blocked') { a.shake = Math.max(a.shake, 1); emit(a, 'blocked'); return; }
  a.fx = { x: e.x, y: e.y - FIGHTER_H * 0.55, age: 0, on: true };
  a.combo.count += 1; a.combo.timer = COMBO_WINDOW;
  a.stats.hits += 1;
  a.stats.maxCombo = Math.max(a.stats.maxCombo, a.combo.count);
  if (kind === 'heavy') a.stats.heavyHits += 1;
  if (kind === 'light3') a.stats.chain3 += 1;
  a.energy = Math.min(MAX_ENERGY, a.energy + ENERGY_GAIN[kind] * a.perks.energyGain);
  const big = kind === 'special' || kind === 'heavy';
  const shakeBy = kind === 'special' ? 10 : kind === 'heavy' ? 6 : kind === 'light3' ? 5 : 3;
  a.shake = Math.max(a.shake, shakeBy);
  emit(a, big ? 'hit_heavy' : 'hit_light');
  const dead = e.state === 'dead';
  emitImpact(a.particles, e.x, e.y - FIGHTER_H * 0.55,
    a.particles.perHit * (dead ? 2 : big ? 1.5 : 1), big ? 230 : 180);
  if (dead) { a.stats.kills += 1; emit(a, 'enemy_down'); }
}

function updateProjectiles(a: Arena, dt: number): void {
  const p = a.player;
  let anyDead = false;
  for (const pr of a.projectiles) {
    pr.x += pr.vx * dt;
    if (pr.x < -20 || pr.x > WORLD_W + 20) { pr.alive = false; anyDead = true; continue; }
    const box = { x: pr.x - PROJECTILE_W / 2, y: pr.y - PROJECTILE_H / 2, w: PROJECTILE_W, h: PROJECTILE_H };
    if (!rectsOverlap(box, hurtbox(p))) continue;
    const r = applyHit(p, p.x - Math.sign(pr.vx), pr.damage, pr.knockback, {
      blockReduction: a.perks.blockReduction, damageMul: a.perks.damageTaken,
    });
    if (r !== 'ignored') { pr.alive = false; anyDead = true; onPlayerHit(a, r); }
  }
  if (anyDead) a.projectiles = a.projectiles.filter((pr) => pr.alive);
}

/** Active hazards hurt a grounded player. Dodge i-frames and jumping both avoid them. */
function updateHazards(a: Arena): void {
  const p = a.player;
  if (p.state === 'dead') return;
  for (const h of a.hazards) {
    if (h.kind === 'ice' || hazardPhase(h, a.time) !== 2) continue;
    if (!rectsOverlap(hazardBox(h), hurtbox(p))) continue;
    onPlayerHit(a, applyHit(p, h.x + h.w / 2, h.damage, 160, { unblockable: true, damageMul: a.perks.damageTaken }));
  }
}

function resolveHits(a: Arena): void {
  const p = a.player;

  if (p.state === 'attack' && p.attackKind) {
    const base = PLAYER_ATTACKS[p.attackKind];
    const def = a.perks.reach === 1 ? base : { ...base, reach: base.reach * a.perks.reach };
    const box = attackHitbox(p, def);
    if (box) {
      for (const e of a.enemies) {
        if (e.state === 'dead' || e.hitBySwing === a.swing) continue;
        if (!rectsOverlap(box, hurtbox(e))) continue;
        e.hitBySwing = a.swing;
        const dmg = def.damage * a.perks.damage * comboMultiplier(a.combo.count);
        const r = applyHit(e, p.x, dmg, def.knockback, {
          armored: defOf(e).armored, invuln: ENEMY_HIT_INVULN,
        });
        if (r === 'hit') p.hitLanded = true;
        onEnemyHit(a, e, r, p.attackKind);
      }
    }
  }

  if (p.state === 'special' && !p.hitLanded && p.t >= SPECIAL.windup) {
    p.hitLanded = true;
    a.shake = Math.max(a.shake, 10);
    for (const e of a.enemies) {
      if (e.state === 'dead' || Math.abs(e.x - p.x) > SPECIAL.radius) continue;
      const dmg = SPECIAL.damage * a.perks.specialDamage * comboMultiplier(a.combo.count);
      const r = applyHit(e, p.x, dmg, SPECIAL.knockback, {
        armored: defOf(e).armored, unblockable: true, invuln: ENEMY_HIT_INVULN,
      });
      onEnemyHit(a, e, r, 'special');
    }
  }

  for (const e of a.enemies) {
    const d = defOf(e);
    if (e.state !== 'attack' || e.hitLanded || d.style === 'shot') continue;
    const box = attackHitbox(e, enemyAttackDef(d));
    if (box && rectsOverlap(box, hurtbox(p))) {
      e.hitLanded = true;
      onPlayerHit(a, applyHit(p, e.x, enemyDamage(e, d), d.knockback, {
        blockReduction: a.perks.blockReduction, damageMul: a.perks.damageTaken,
      }));
    }
  }
}

/* ------------------------------ step ------------------------------ */

/** Advance the simulation by one fixed step. Mutates `a`. */
export function stepArena(a: Arena, input: Input, dt: number = FIXED_DT): void {
  if (a.over) return;
  a.time += dt;
  a.shake = Math.max(0, a.shake - 40 * dt);
  if (a.fx.on) { a.fx.age += dt; if (a.fx.age >= FX_TIME) a.fx.on = false; }
  stepParticles(a.particles, dt, a.time);

  const b = a.buffer;
  if (input.light) b.light = BUFFER_TIME;
  if (input.heavy) b.heavy = BUFFER_TIME;
  if (input.dodge) b.dodge = BUFFER_TIME;
  if (input.special) b.special = BUFFER_TIME;
  b.light = Math.max(0, b.light - dt); b.heavy = Math.max(0, b.heavy - dt);
  b.dodge = Math.max(0, b.dodge - dt); b.special = Math.max(0, b.special - dt);

  if (a.hitstop > 0) { a.hitstop -= dt; return; }

  if (a.combo.count > 0) {
    a.combo.timer -= dt;
    if (a.combo.timer <= 0) a.combo.count = 0;
  }

  updatePlayer(a, input, dt);
  for (const e of a.enemies) updateEnemy(a, e, dt);
  separate(a);
  updateProjectiles(a, dt);
  updateHazards(a);
  resolveHits(a);

  if (a.player.hp <= 0) { finish(a, 'defeat'); return; }

  if (!a.tutorial && !a.enemies.some((e) => e.state !== 'dead')) {
    if (a.waves.length === 0) { finish(a, 'victory'); return; }
    if (a.waveClearedAt === null) a.waveClearedAt = a.time;
    if (a.time - a.waveClearedAt >= WAVE_DELAY) {
      const p = a.player;
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * a.healPerWave);
      spawnNextWave(a);
      a.waveClearedAt = null;
    }
  }
  updateTutorial(a);
}