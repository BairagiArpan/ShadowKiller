import type { GameEvent } from '../engine/types';

export type SfxName = GameEvent | 'ui_tap';
export type MusicTrack = 'menu' | 'boss' | `world_${1 | 2 | 3 | 4 | 5}`;

/** Phase 7b plugs a real backend in here. Until then everything is silent. */
export interface AudioBackend {
  playSfx(name: SfxName): void;
  playMusic(track: MusicTrack): void;
  stopMusic(): void;
}

const silent: AudioBackend = { playSfx() {}, playMusic() {}, stopMusic() {} };

let backend: AudioBackend = silent;
let sfxOn = true;
let musicOn = true;
let current: MusicTrack | null = null;

export function setAudioBackend(b: AudioBackend): void {
  backend = b;
  if (musicOn && current) backend.playMusic(current);
}
export function playSfx(name: SfxName): void { if (sfxOn) backend.playSfx(name); }
export function playMusic(track: MusicTrack): void { current = track; if (musicOn) backend.playMusic(track); }
export function stopMusic(): void { current = null; backend.stopMusic(); }

export function configureAudio(o: { sound: boolean; music: boolean }): void {
  sfxOn = o.sound;
  if (o.music === musicOn) return;
  musicOn = o.music;
  if (!o.music) backend.stopMusic();
  else if (current) backend.playMusic(current);
}

export function resetAudioForTests(): void {
  backend = silent; sfxOn = true; musicOn = true; current = null;
}