import type { GameEvent } from '../engine/types';

export type SfxName = GameEvent | 'ui_tap';
export type MusicTrack = 'menu' | 'boss' | `world_${1 | 2 | 3 | 4 | 5}`;

export interface AudioBackend {
  playSfx(name: SfxName): void;
  playMusic(track: MusicTrack): void;
  stopMusic(): void;
  /** Master volumes from 0 to 1. Optional, so a simple backend can ignore it. */
  setVolumes?(sfx: number, music: number): void;
}

const silent: AudioBackend = { playSfx() {}, playMusic() {}, stopMusic() {} };
const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1);

let backend: AudioBackend = silent;
let sfxOn = true;
let musicOn = true;
let sfxVol = 1;
let musicVol = 1;
let current: MusicTrack | null = null;

/** A backend that arrives late gets the current volumes and any music requested earlier. */
export function setAudioBackend(b: AudioBackend): void {
  backend = b;
  backend.setVolumes?.(sfxVol, musicVol);
  if (musicOn && current) backend.playMusic(current);
}
export function playSfx(name: SfxName): void { if (sfxOn) backend.playSfx(name); }
export function playMusic(track: MusicTrack): void { current = track; if (musicOn) backend.playMusic(track); }
export function stopMusic(): void { current = null; backend.stopMusic(); }

export function configureAudio(o: { sound: boolean; music: boolean; soundVolume?: number; musicVolume?: number }): void {
  sfxOn = o.sound;
  if (o.soundVolume !== undefined) sfxVol = clamp01(o.soundVolume);
  if (o.musicVolume !== undefined) musicVol = clamp01(o.musicVolume);
  backend.setVolumes?.(sfxVol, musicVol);
  if (o.music === musicOn) return;
  musicOn = o.music;
  if (!o.music) backend.stopMusic();
  else if (current) backend.playMusic(current);
}

export function resetAudioForTests(): void {
  backend = silent; sfxOn = true; musicOn = true; sfxVol = 1; musicVol = 1; current = null;
}