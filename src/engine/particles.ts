import { GROUND_Y, WORLD_W } from './constants';

export type AmbientStyle = 'motes' | 'ash' | 'snow' | 'embers' | 'void';
export interface Point { x: number; y: number }

export interface Pool {
  cap: number;
  x: Float32Array; y: Float32Array; vx: Float32Array; vy: Float32Array; life: Float32Array;
}

/** Visual-only. Owns its own seeded random generator so it can never affect combat. */
export interface ParticleSystem {
  style: AmbientStyle;
  ambient: Pool; impact: Pool; hurt: Pool;
  ambientActive: number; // how many ambient particles are currently drawn (<= ambient.cap)
  perHit: number;        // impact particles per hit
  heads: [number, number];
  seed: number;
}

export const NO_POINTS: Point[] = [{ x: -50, y: -50 }]; // drawn off-screen when a group is empty

const RISING: Record<AmbientStyle, boolean> = { motes: true, ash: false, snow: false, embers: true, void: true };

function makePool(cap: number): Pool {
  const n = Math.max(0, Math.floor(cap));
  return {
    cap: n, x: new Float32Array(n), y: new Float32Array(n),
    vx: new Float32Array(n), vy: new Float32Array(n), life: new Float32Array(n),
  };
}

function rand(ps: ParticleSystem): number {
  ps.seed = (Math.imul(ps.seed, 1664525) + 1013904223) >>> 0;
  return ps.seed / 4294967296;
}

function spawnAmbient(ps: ParticleSystem, i: number, anywhere: boolean): void {
  const p = ps.ambient;
  p.x[i] = rand(ps) * WORLD_W;
  p.y[i] = anywhere ? rand(ps) * GROUND_Y : RISING[ps.style] ? GROUND_Y : -4;
  const r = rand(ps);
  switch (ps.style) {
    case 'motes':  p.vx[i] = (r - 0.5) * 16;      p.vy[i] = -(6 + rand(ps) * 8); break;
    case 'ash':    p.vx[i] = 12 + r * 14;         p.vy[i] = 14 + rand(ps) * 14; break;
    case 'snow':   p.vx[i] = (r - 0.5) * 20;      p.vy[i] = 25 + rand(ps) * 25; break;
    case 'embers': p.vx[i] = (r - 0.5) * 28;      p.vy[i] = -(30 + rand(ps) * 40); break;
    case 'void':   p.vx[i] = (r - 0.5) * 20;      p.vy[i] = -(4 + rand(ps) * 10); break;
  }
  p.life[i] = 1;
}

export function createParticles(
  style: AmbientStyle, ambientCount: number, impactCap: number, perHit: number, seed = 12345,
): ParticleSystem {
  const ps: ParticleSystem = {
    style, ambient: makePool(ambientCount), impact: makePool(impactCap),
    hurt: makePool(Math.floor(impactCap / 2)),
    ambientActive: Math.max(0, Math.floor(ambientCount)), perHit: Math.max(0, Math.floor(perHit)),
    heads: [0, 0], seed: seed >>> 0,
  };
  for (let i = 0; i < ps.ambient.cap; i++) spawnAmbient(ps, i, true);
  return ps;
}

/** Lower (never raise past the pool size) the drawn amount at runtime, e.g. after an auto-downgrade. */
export function setParticleLimits(ps: ParticleSystem, ambientActive: number, perHit: number): void {
  ps.ambientActive = Math.max(0, Math.min(ps.ambient.cap, Math.floor(ambientActive)));
  ps.perHit = Math.max(0, Math.floor(perHit));
}

function burst(ps: ParticleSystem, pool: Pool, which: 0 | 1, x: number, y: number, count: number, power: number): void {
  if (pool.cap === 0) return;
  const n = Math.max(0, Math.floor(count));
  for (let k = 0; k < n; k++) {
    const i = ps.heads[which];
    ps.heads[which] = (i + 1) % pool.cap;
    const ang = rand(ps) * Math.PI * 2;
    const sp = power * (0.4 + rand(ps) * 0.6);
    pool.x[i] = x; pool.y[i] = y;
    pool.vx[i] = Math.cos(ang) * sp;
    pool.vy[i] = Math.sin(ang) * sp - power * 0.25;
    pool.life[i] = 0.25 + rand(ps) * 0.25;
  }
}

export function emitImpact(ps: ParticleSystem, x: number, y: number, count: number, power = 180): void {
  burst(ps, ps.impact, 0, x, y, count, power);
}
export function emitHurt(ps: ParticleSystem, x: number, y: number, count: number, power = 160): void {
  burst(ps, ps.hurt, 1, x, y, count, power);
}

function stepBurst(p: Pool, dt: number): void {
  for (let i = 0; i < p.cap; i++) {
    if (p.life[i] <= 0) continue;
    p.life[i] -= dt;
    if (p.life[i] <= 0) { p.life[i] = 0; continue; }
    p.x[i] += p.vx[i] * dt;
    p.vy[i] += 520 * dt;
    p.y[i] += p.vy[i] * dt;
  }
}

export function stepParticles(ps: ParticleSystem, dt: number, time: number): void {
  const a = ps.ambient;
  const n = Math.min(ps.ambientActive, a.cap);
  const rising = RISING[ps.style];
  const sway = ps.style === 'snow' || ps.style === 'embers';
  for (let i = 0; i < n; i++) {
    a.x[i] += (a.vx[i] + (sway ? Math.sin(time * 1.5 + i) * 8 : 0)) * dt;
    a.y[i] += a.vy[i] * dt;
    if (a.x[i] < 0) a.x[i] += WORLD_W; else if (a.x[i] > WORLD_W) a.x[i] -= WORLD_W;
    if (rising ? a.y[i] < -8 : a.y[i] > GROUND_Y) spawnAmbient(ps, i, false);
  }
  stepBurst(ps.impact, dt);
  stepBurst(ps.hurt, dt);
}

export function liveCount(p: Pool, limit = p.cap): number {
  let n = 0;
  for (let i = 0; i < Math.min(limit, p.cap); i++) if (p.life[i] > 0) n += 1;
  return n;
}

/** Live particles as drawable points (a shared off-screen point when there are none). */
export function pointsOf(p: Pool, limit = p.cap): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < Math.min(limit, p.cap); i++) if (p.life[i] > 0) out.push({ x: p.x[i], y: p.y[i] });
  return out.length > 0 ? out : NO_POINTS;
}