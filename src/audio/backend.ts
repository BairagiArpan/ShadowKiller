import type { AudioBackend, MusicTrack, SfxName } from './audio';

/** The few player features we need. The Expo player is adapted to this in expoFactory.ts. */
export interface PlayerLike {
  play(): void;
  pause(): void;
  seekTo(seconds: number): unknown;
  loop: boolean;
  volume: number;
  release(): void;
}
export type PlayerFactory = (source: unknown) => PlayerLike;

export interface BackendConfig {
  sfx: Record<SfxName, unknown>;
  music: Record<MusicTrack, unknown>;
  sfxVolume: Partial<Record<SfxName, number>>;
  musicVolume: number;
  voices?: number;                 // players per effect so overlapping hits do not cut each other off
  minGapMs?: number;               // per-effect throttle
  now?: () => number;
  onError?: (msg: string, e: unknown) => void;
}

export type Backend = AudioBackend & { dispose(): void };

/** Runs a player call; swallows both thrown errors and rejected promises. Audio must never crash the game. */
function safe(fn: () => unknown, onError: (m: string, e: unknown) => void, what: string): void {
  try {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).catch === 'function') {
      (r as Promise<unknown>).catch((e) => onError(what, e));
    }
  } catch (e) {
    onError(what, e);
  }
}

interface Pool { players: PlayerLike[]; next: number; last: number }

export function createBackend(make: PlayerFactory, cfg: BackendConfig): Backend {
  const voices = cfg.voices ?? 2;
  const gap = cfg.minGapMs ?? 40;
  const now = cfg.now ?? Date.now;
  const onError = cfg.onError ?? ((m, e) => console.warn(`audio: ${m}`, e));

  const pools = new Map<SfxName, Pool>();
  for (const name of Object.keys(cfg.sfx) as SfxName[]) {
    const players: PlayerLike[] = [];
    for (let i = 0; i < voices; i++) {
      try {
        const p = make(cfg.sfx[name]);
        p.volume = cfg.sfxVolume[name] ?? 0.7;
        players.push(p);
      } catch (e) {
        onError(`could not load ${name}`, e);
      }
    }
    if (players.length > 0) pools.set(name, { players, next: 0, last: -1e12 });
  }

  let music: { track: MusicTrack; player: PlayerLike } | null = null;

  const stopMusic = () => {
    if (!music) return;
    const m = music;
    music = null;
    safe(() => m.player.pause(), onError, 'pause music');
    safe(() => m.player.release(), onError, 'release music');
  };

  return {
    playSfx(name) {
      const pool = pools.get(name);
      if (!pool) return;
      const t = now();
      if (t - pool.last < gap) return;
      pool.last = t;
      const p = pool.players[pool.next];
      pool.next = (pool.next + 1) % pool.players.length;
      safe(() => p.seekTo(0), onError, `rewind ${name}`);
      safe(() => p.play(), onError, `play ${name}`);
    },

    playMusic(track) {
      if (music && music.track === track) return; // already playing: do not restart
      stopMusic();
      const source = cfg.music[track];
      if (source === undefined) return;
      try {
        const player = make(source);
        player.loop = true;
        player.volume = cfg.musicVolume;
        music = { track, player };
        safe(() => player.play(), onError, `play music ${track}`);
      } catch (e) {
        music = null;
        onError(`could not start music ${track}`, e);
      }
    },

    stopMusic,

    dispose() {
      stopMusic();
      pools.forEach((pool) => pool.players.forEach((p) => safe(() => p.release(), onError, 'release sfx')));
      pools.clear();
    },
  };
}