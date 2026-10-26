'use strict';
/**
 * Original, deterministic sound synthesis. Pure JS (no dependencies) so it runs in Node and in Jest.
 * Everything here is generated from oscillators and noise: no samples, no third-party audio.
 */

const SFX_RATE = 22050;
const MUSIC_RATE = 16000;
const MUSIC_BARS = 8;

function seedOf(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

function makeRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCtx(seconds, rate, wrap, seed) {
  return { buf: new Float32Array(Math.round(seconds * rate)), rate, wrap, rand: makeRand(seed) };
}

function osc(type, phase) {
  const p = phase - Math.floor(phase);
  switch (type) {
    case 'square': return p < 0.5 ? 1 : -1;
    case 'saw': return 2 * p - 1;
    case 'tri': return 4 * Math.abs(p - 0.5) - 1;
    default: return Math.sin(2 * Math.PI * p);
  }
}

/** Attack ramp, optional exponential decay, and a short release so a note always ends at zero. */
function envelope(t, dur, attack, decay) {
  let e = Math.min(1, t / attack);
  if (decay) e *= Math.exp(-decay * t);
  const rel = Math.min(0.02, dur * 0.3);
  const left = dur - t;
  if (left < rel) e *= Math.max(0, left / rel);
  return e;
}

function put(c, idx, v) {
  if (idx >= c.buf.length && !c.wrap) return false;
  c.buf[idx % c.buf.length] += v;
  return true;
}

/** o: { start, dur, f0, f1, type, vol, attack, decay } (f0 -> f1 is a linear pitch sweep) */
function tone(c, o) {
  const n = Math.floor(o.dur * c.rate);
  const s0 = Math.floor((o.start || 0) * c.rate);
  const attack = Math.max(o.attack || 0.004, 1 / c.rate);
  const f1 = o.f1 === undefined ? o.f0 : o.f1;
  const vol = o.vol === undefined ? 0.5 : o.vol;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / c.rate;
    ph += (o.f0 + (f1 - o.f0) * (i / n)) / c.rate;
    const v = osc(o.type || 'sine', ph) * envelope(t, o.dur, attack, o.decay || 0) * vol;
    if (!put(c, s0 + i, v)) break;
  }
}

/** o: { start, dur, vol, decay, lp (0..1, higher = brighter), hp (true = high-pass), attack } */
function noise(c, o) {
  const n = Math.floor(o.dur * c.rate);
  const s0 = Math.floor((o.start || 0) * c.rate);
  const attack = Math.max(o.attack || 0.002, 1 / c.rate);
  const lp = o.lp === undefined ? 0.5 : o.lp;
  const vol = o.vol === undefined ? 0.5 : o.vol;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / c.rate;
    const w = c.rand() * 2 - 1;
    y += (w - y) * lp;
    const v = (o.hp ? w - y : y) * envelope(t, o.dur, attack, o.decay || 0) * vol;
    if (!put(c, s0 + i, v)) break;
  }
}

function normalize(buf, peak) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
  if (max === 0) return buf;
  const k = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return buf;
}

/* ------------------------------ sound effects ------------------------------ */

const SFX = {
  hit_light: { len: 0.16, build(c) {
    noise(c, { dur: 0.09, vol: 0.5, decay: 35, lp: 0.5 });
    tone(c, { dur: 0.1, f0: 260, f1: 100, type: 'saw', vol: 0.3, decay: 25 });
  } },
  hit_heavy: { len: 0.3, build(c) {
    noise(c, { dur: 0.2, vol: 0.6, decay: 18, lp: 0.35 });
    tone(c, { dur: 0.25, f0: 140, f1: 40, type: 'sine', vol: 0.7, decay: 9 });
    tone(c, { dur: 0.1, f0: 300, f1: 100, type: 'square', vol: 0.2, decay: 25 });
  } },
  blocked: { len: 0.15, build(c) {
    tone(c, { dur: 0.07, f0: 900, f1: 700, type: 'square', vol: 0.3, decay: 30 });
    tone(c, { dur: 0.1, f0: 1300, type: 'sine', vol: 0.3, decay: 25 });
    noise(c, { dur: 0.04, vol: 0.25, hp: true, lp: 0.2, decay: 40 });
  } },
  dodge: { len: 0.22, build(c) {
    noise(c, { dur: 0.18, vol: 0.4, lp: 0.9, hp: true, attack: 0.05, decay: 12 });
  } },
  special: { len: 0.55, build(c) {
    tone(c, { dur: 0.45, f0: 200, f1: 1200, type: 'saw', vol: 0.3, decay: 2 });
    tone(c, { dur: 0.45, f0: 100, f1: 400, type: 'sine', vol: 0.4, decay: 2 });
    noise(c, { dur: 0.3, vol: 0.3, lp: 0.4, decay: 8, start: 0.1 });
  } },
  hurt: { len: 0.22, build(c) {
    tone(c, { dur: 0.18, f0: 300, f1: 120, type: 'square', vol: 0.4, decay: 12 });
    noise(c, { dur: 0.12, vol: 0.3, lp: 0.4, decay: 20 });
  } },
  enemy_down: { len: 0.5, build(c) {
    tone(c, { dur: 0.45, f0: 260, f1: 50, type: 'saw', vol: 0.5, decay: 6 });
    noise(c, { dur: 0.25, vol: 0.4, lp: 0.3, decay: 10 });
  } },
  boss_phase: { len: 1.1, build(c) {
    tone(c, { dur: 1.0, f0: 70, f1: 45, type: 'sine', vol: 0.8, decay: 1.5 });
    tone(c, { dur: 1.0, f0: 140, f1: 90, type: 'saw', vol: 0.3, decay: 2 });
    noise(c, { dur: 0.8, vol: 0.3, lp: 0.2, decay: 3 });
  } },
  victory: { len: 1.4, build(c) {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const dur = i === 3 ? 0.8 : 0.3;
      tone(c, { start: i * 0.14, dur, f0: f, type: 'tri', vol: 0.4, decay: 3 });
      tone(c, { start: i * 0.14, dur, f0: f * 2, type: 'sine', vol: 0.15, decay: 4 });
    });
  } },
  defeat: { len: 2.0, build(c) {
    [440, 349.23, 293.66, 220].forEach((f, i) => {
      const dur = i === 3 ? 1.0 : 0.5;
      tone(c, { start: i * 0.28, dur, f0: f, type: 'saw', vol: 0.22, decay: 2.5 });
      tone(c, { start: i * 0.28, dur, f0: f / 2, type: 'sine', vol: 0.3, decay: 2 });
    });
  } },
  ui_tap: { len: 0.08, build(c) {
    tone(c, { dur: 0.05, f0: 800, type: 'sine', vol: 0.3, decay: 40 });
  } },
};

const SFX_NAMES = Object.keys(SFX);

function renderSfx(name) {
  const def = SFX[name];
  if (!def) throw new Error(`unknown sfx ${name}`);
  const c = makeCtx(def.len, SFX_RATE, false, seedOf(name));
  def.build(c);
  return normalize(c.buf, 0.9);
}

/* --------------------------------- music --------------------------------- */

const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
const LOCRIAN_ISH = [0, 1, 3, 5, 6, 8, 10];
const PHRYGIAN_DOMINANT = [0, 1, 4, 5, 7, 8, 10];

// prog: one chord root (scale degree) per bar. arp: 8 eighth-note offsets (null = rest).
const MUSIC = {
  menu: { bpm: 70, root: 110, scale: NATURAL_MINOR, prog: [0, 5, 3, 4, 0, 5, 6, 4],
    arp: [0, null, 2, null, 4, null, 2, null], lead: 'sine', bass: 'sine',
    pad: 0.1, arpVol: 0.12, bassVol: 0.25, drums: null },
  world_1: { bpm: 84, root: 110, scale: NATURAL_MINOR, prog: [0, 0, 5, 4, 0, 0, 3, 4],
    arp: [0, 2, 4, 2, 0, 2, 4, 7], lead: 'tri', bass: 'saw',
    pad: 0.08, arpVol: 0.13, bassVol: 0.2, drums: { kick: [0, 4], snare: [], hat: true } },
  world_2: { bpm: 96, root: 98, scale: PHRYGIAN, prog: [0, 1, 0, 6, 0, 1, 3, 1],
    arp: [0, null, 1, 2, 0, null, 4, 2], lead: 'square', bass: 'saw',
    pad: 0.07, arpVol: 0.09, bassVol: 0.22, drums: { kick: [0, 3, 4], snare: [6], hat: true } },
  world_3: { bpm: 78, root: 123.47, scale: DORIAN, prog: [0, 3, 4, 0, 5, 3, 4, 0],
    arp: [4, null, 2, null, 5, null, 3, 7], lead: 'tri', bass: 'sine',
    pad: 0.1, arpVol: 0.14, bassVol: 0.25, drums: { kick: [0], snare: [], hat: false } },
  world_4: { bpm: 108, root: 82.41, scale: HARMONIC_MINOR, prog: [0, 0, 5, 6, 0, 0, 3, 4],
    arp: [0, 2, 4, 6, 4, 2, 0, 2], lead: 'saw', bass: 'saw',
    pad: 0.06, arpVol: 0.09, bassVol: 0.24, drums: { kick: [0, 4, 6], snare: [2, 6], hat: true } },
  world_5: { bpm: 90, root: 87.31, scale: LOCRIAN_ISH, prog: [0, 1, 0, 4, 0, 1, 6, 4],
    arp: [0, 3, null, 6, 4, null, 1, 5], lead: 'square', bass: 'sine',
    pad: 0.09, arpVol: 0.08, bassVol: 0.26, drums: { kick: [0, 4], snare: [], hat: true } },
  boss: { bpm: 132, root: 98, scale: PHRYGIAN_DOMINANT, prog: [0, 0, 1, 0, 0, 0, 1, 6],
    arp: [0, 0, 2, 0, 3, 0, 2, 0], lead: 'saw', bass: 'saw',
    pad: 0.06, arpVol: 0.09, bassVol: 0.28, drums: { kick: [0, 2, 4, 6], snare: [2, 6], hat: true } },
};

const MUSIC_NAMES = Object.keys(MUSIC);

function degFreq(m, deg) {
  const L = m.scale.length;
  const oct = Math.floor(deg / L);
  const idx = ((deg % L) + L) % L;
  return m.root * Math.pow(2, (m.scale[idx] + 12 * oct) / 12);
}

function musicSeconds(name) {
  return (MUSIC_BARS * 4 * 60) / MUSIC[name].bpm;
}

function renderMusic(name) {
  const m = MUSIC[name];
  if (!m) throw new Error(`unknown music ${name}`);
  const beat = 60 / m.bpm;
  const slot = beat / 2; // one eighth note
  const c = makeCtx(musicSeconds(name), MUSIC_RATE, true, seedOf(name));

  for (let bar = 0; bar < MUSIC_BARS; bar++) {
    const t0 = bar * 4 * beat;
    const chord = m.prog[bar];

    for (const k of [0, 2, 4]) { // pad: the chord, held for the bar
      tone(c, { start: t0, dur: 4 * beat, f0: degFreq(m, chord + k) * 2, type: 'tri', vol: m.pad, attack: 0.3 });
    }
    for (const half of [0, 1]) { // bass: root on beats 1 and 3
      tone(c, { start: t0 + half * 2 * beat, dur: 2 * beat - 0.01, f0: degFreq(m, chord), type: m.bass,
        vol: m.bassVol, decay: 3 });
    }
    for (let s = 0; s < 8; s++) { // arpeggio
      const off = m.arp[s % m.arp.length];
      if (off === null) continue;
      tone(c, { start: t0 + s * slot, dur: slot * 0.9, f0: degFreq(m, chord + off) * 4, type: m.lead,
        vol: m.arpVol, decay: 8 });
    }
    if (m.drums) {
      for (const s of m.drums.kick) {
        tone(c, { start: t0 + s * slot, dur: 0.15, f0: 150, f1: 45, type: 'sine', vol: 0.55, decay: 14 });
      }
      for (const s of m.drums.snare) {
        noise(c, { start: t0 + s * slot, dur: 0.12, vol: 0.28, lp: 0.6, decay: 22 });
        tone(c, { start: t0 + s * slot, dur: 0.1, f0: 190, type: 'tri', vol: 0.2, decay: 25 });
      }
      if (m.drums.hat) {
        for (let s = 1; s < 8; s += 2) {
          noise(c, { start: t0 + s * slot, dur: 0.04, vol: 0.12, hp: true, lp: 0.15, decay: 60 });
        }
      }
    }
  }
  return normalize(c.buf, 0.8);
}

/* --------------------------------- output --------------------------------- */

/** Mono 16-bit PCM WAV. */
function toWav(buf, rate) {
  const n = buf.length;
  const out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + n * 2, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);     // PCM
  out.writeUInt16LE(1, 22);     // mono
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, buf[i]));
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return out;
}

module.exports = {
  SFX_RATE, MUSIC_RATE, MUSIC_BARS, SFX_NAMES, MUSIC_NAMES,
  renderSfx, renderMusic, musicSeconds, toWav,
};