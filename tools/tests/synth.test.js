const fs = require('fs');
const path = require('path');
const {
  SFX_NAMES, MUSIC_NAMES, SFX_RATE, MUSIC_RATE, MUSIC_BARS,
  renderSfx, renderMusic, musicSeconds, toWav,
} = require('../synth');

const peakOf = (b) => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const clean = (b) => b.every((v) => Number.isFinite(v));

describe('sound effects', () => {
  it('covers every game event plus the UI tap', () => {
    expect([...SFX_NAMES].sort()).toEqual([
      'blocked', 'boss_phase', 'defeat', 'dodge', 'enemy_down', 'hit_heavy', 'hit_light',
      'hurt', 'special', 'ui_tap', 'victory',
    ]);
  });
  it.each(SFX_NAMES)('%s is finite, normalized, audible and click-free', (name) => {
    const b = renderSfx(name);
    expect(clean(b)).toBe(true);
    expect(peakOf(b)).toBeGreaterThan(0.85);
    expect(peakOf(b)).toBeLessThanOrEqual(0.9001);
    expect(b.length / SFX_RATE).toBeGreaterThan(0.05);
    expect(b.length / SFX_RATE).toBeLessThan(2.5);
    expect(Math.abs(b[0])).toBeLessThan(0.02);
    expect(Math.abs(b[b.length - 1])).toBeLessThan(0.02);
  });
  it('is deterministic and the sounds differ from each other', () => {
    expect(Array.from(renderSfx('hit_heavy'))).toEqual(Array.from(renderSfx('hit_heavy')));
    expect(renderSfx('hit_light').length).not.toBe(renderSfx('victory').length);
  });
});

describe('music', () => {
  it('has the 7 expected tracks', () => {
    expect([...MUSIC_NAMES].sort()).toEqual(
      ['boss', 'menu', 'world_1', 'world_2', 'world_3', 'world_4', 'world_5']);
  });
  it.each(MUSIC_NAMES)('%s is finite, normalized, exactly %i bars long and loops without a click', (name) => {
    const b = renderMusic(name);
    expect(clean(b)).toBe(true);
    expect(peakOf(b)).toBeGreaterThan(0.75);
    expect(peakOf(b)).toBeLessThanOrEqual(0.8001);
    expect(Math.abs(b.length - musicSeconds(name) * MUSIC_RATE)).toBeLessThanOrEqual(1);
    expect(Math.abs(b[0])).toBeLessThan(0.02);
    expect(Math.abs(b[b.length - 1])).toBeLessThan(0.05);
  });
  it('is deterministic', () => {
    expect(Array.from(renderMusic('boss'))).toEqual(Array.from(renderMusic('boss')));
  });
  it('uses 8 bars and the boss track is the fastest', () => {
    expect(MUSIC_BARS).toBe(8);
    expect(musicSeconds('boss')).toBeLessThan(musicSeconds('world_1'));
    expect(musicSeconds('menu')).toBeGreaterThan(musicSeconds('world_1'));
  });
});

describe('WAV output', () => {
  it('writes a valid mono 16-bit PCM header', () => {
    const wav = toWav(renderSfx('ui_tap'), SFX_RATE);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(SFX_RATE);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
    expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
  });
  it('clamps out-of-range samples instead of wrapping', () => {
    const wav = toWav(new Float32Array([2, -2]), 8000);
    expect(wav.readInt16LE(44)).toBe(32767);
    expect(wav.readInt16LE(46)).toBe(-32767);
  });
});

describe('asset map consistency', () => {
  it('src/audio/assets.ts requires exactly the files the generator makes', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'audio', 'assets.ts'), 'utf8');
    const found = Array.from(src.matchAll(/assets\/audio\/(sfx|music)\/(\w+)\.wav/g)).map((m) => `${m[1]}/${m[2]}`);
    const expected = [...SFX_NAMES.map((n) => `sfx/${n}`), ...MUSIC_NAMES.map((n) => `music/${n}`)];
    expect(found.sort()).toEqual(expected.sort());
  });
});