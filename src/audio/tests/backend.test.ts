import { PlayerLike, createBackend } from '../backend';
import type { MusicTrack, SfxName } from '../audio';
import {it, describe,expect } from '@jest/globals'; 

class FakePlayer implements PlayerLike {
  loop = false; volume = 1; plays = 0; pauses = 0; seeks = 0; released = false;
  constructor(public source: unknown, private failPlay = false) {}
  play() { if (this.failPlay) throw new Error('boom'); this.plays += 1; }
  pause() { this.pauses += 1; }
  seekTo() { this.seeks += 1; return Promise.reject(new Error('seek failed')); } // rejected on purpose
  release() { this.released = true; }
}

const SFX: SfxName[] = ['hit_light', 'hit_heavy', 'blocked', 'dodge', 'special', 'hurt', 'enemy_down', 'boss_phase', 'victory', 'defeat', 'ui_tap'];
const MUSIC: MusicTrack[] = ['menu', 'boss', 'world_1', 'world_2', 'world_3', 'world_4', 'world_5'];

function setup(opts: { failPlay?: boolean } = {}) {
  const players: FakePlayer[] = [];
  let time = 0;
  const backend = createBackend((src) => { const p = new FakePlayer(src, opts.failPlay); players.push(p); return p; }, {
    sfx: Object.fromEntries(SFX.map((n) => [n, `sfx:${n}`])) as Record<SfxName, unknown>,
    music: Object.fromEntries(MUSIC.map((n) => [n, `music:${n}`])) as Record<MusicTrack, unknown>,
    sfxVolume: { hit_heavy: 0.8 }, musicVolume: 0.4, now: () => time, onError: () => {},
  });
  const sfxPlayers = (name: string) => players.filter((p) => p.source === `sfx:${name}`);
  return { backend, players, sfxPlayers, advance: (ms: number) => { time += ms; } };
}

describe('sound effects', () => {
  it('preloads two players per effect and applies per-effect volume', () => {
    const { sfxPlayers, players } = setup();
    expect(players).toHaveLength(SFX.length * 2);
    expect(sfxPlayers('hit_heavy')[0].volume).toBe(0.8);
    expect(sfxPlayers('hit_light')[0].volume).toBe(0.7); // default
  });

  it('rewinds and plays, alternating players so hits can overlap', () => {
    const { backend, sfxPlayers, advance } = setup();
    backend.playSfx('hit_light'); advance(100);
    backend.playSfx('hit_light'); advance(100);
    backend.playSfx('hit_light');
    const [a, b] = sfxPlayers('hit_light');
    expect(a.plays).toBe(2);
    expect(b.plays).toBe(1);
    expect(a.seeks + b.seeks).toBe(3);
  });

  it('throttles an effect that fires faster than the minimum gap', () => {
    const { backend, sfxPlayers, advance } = setup();
    backend.playSfx('dodge'); advance(10);
    backend.playSfx('dodge'); advance(10);
    backend.playSfx('dodge');
    expect(sfxPlayers('dodge').reduce((s, p) => s + p.plays, 0)).toBe(1);
    advance(50);
    backend.playSfx('dodge');
    expect(sfxPlayers('dodge').reduce((s, p) => s + p.plays, 0)).toBe(2);
  });

  it('never throws, even when players throw or promises reject', () => {
    const { backend } = setup({ failPlay: true });
    expect(() => { backend.playSfx('hurt'); backend.playMusic('menu'); backend.stopMusic(); }).not.toThrow();
  });
});

describe('music', () => {
  it('loops at the configured volume', () => {
    const { backend, players } = setup();
    backend.playMusic('world_1');
    const m = players.find((p) => p.source === 'music:world_1')!;
    expect(m.loop).toBe(true);
    expect(m.volume).toBe(0.4);
    expect(m.plays).toBe(1);
  });

  it('does not restart a track that is already playing', () => {
    const { backend, players } = setup();
    backend.playMusic('menu'); backend.playMusic('menu');
    expect(players.filter((p) => p.source === 'music:menu')).toHaveLength(1);
    expect(players.find((p) => p.source === 'music:menu')!.plays).toBe(1);
  });

  it('releases the previous track when switching', () => {
    const { backend, players } = setup();
    backend.playMusic('menu');
    backend.playMusic('boss');
    const menu = players.find((p) => p.source === 'music:menu')!;
    expect(menu.pauses).toBe(1);
    expect(menu.released).toBe(true);
    expect(players.find((p) => p.source === 'music:boss')!.plays).toBe(1);
  });

  it('stopMusic stops and releases, and the same track can be started again', () => {
    const { backend, players } = setup();
    backend.playMusic('menu');
    backend.stopMusic();
    expect(players.find((p) => p.source === 'music:menu')!.released).toBe(true);
    backend.playMusic('menu');
    expect(players.filter((p) => p.source === 'music:menu')).toHaveLength(2);
  });

  it('dispose releases everything', () => {
    const { backend, players } = setup();
    backend.playMusic('menu');
    backend.dispose();
    expect(players.every((p) => p.released)).toBe(true);
  });
});

describe('master volume', () => {
  it('scales effects when played and the running music immediately', () => {
    const { backend, sfxPlayers, players } = setup();
    backend.setVolumes!(0.5, 0.5);
    backend.playSfx('hit_heavy');
    expect(sfxPlayers('hit_heavy')[0].volume).toBeCloseTo(0.4);
    backend.playMusic('menu');
    const m = players.find((p) => p.source === 'music:menu')!;
    expect(m.volume).toBeCloseTo(0.2);
    backend.setVolumes!(1, 0);
    expect(m.volume).toBe(0);
  });
});