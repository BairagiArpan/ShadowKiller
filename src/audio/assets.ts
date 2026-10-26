import type { MusicTrack, SfxName } from './audio';

/*
 * These files are created by `npm run gen:audio`. Metro bundles them at build time, so the files
 * must exist (and be committed) before you run or build the app.
 */
export const SFX_SOURCES: Record<SfxName, unknown> = {
  hit_light: require('../../assets/audio/sfx/hit_light.wav'),
  hit_heavy: require('../../assets/audio/sfx/hit_heavy.wav'),
  blocked: require('../../assets/audio/sfx/blocked.wav'),
  dodge: require('../../assets/audio/sfx/dodge.wav'),
  special: require('../../assets/audio/sfx/special.wav'),
  hurt: require('../../assets/audio/sfx/hurt.wav'),
  enemy_down: require('../../assets/audio/sfx/enemy_down.wav'),
  boss_phase: require('../../assets/audio/sfx/boss_phase.wav'),
  victory: require('../../assets/audio/sfx/victory.wav'),
  defeat: require('../../assets/audio/sfx/defeat.wav'),
  ui_tap: require('../../assets/audio/sfx/ui_tap.wav'),
};

export const MUSIC_SOURCES: Record<MusicTrack, unknown> = {
  menu: require('../../assets/audio/music/menu.wav'),
  boss: require('../../assets/audio/music/boss.wav'),
  world_1: require('../../assets/audio/music/world_1.wav'),
  world_2: require('../../assets/audio/music/world_2.wav'),
  world_3: require('../../assets/audio/music/world_3.wav'),
  world_4: require('../../assets/audio/music/world_4.wav'),
  world_5: require('../../assets/audio/music/world_5.wav'),
};

/** Relative loudness per effect (the files themselves are all normalized to the same peak). */
export const SFX_VOLUME: Partial<Record<SfxName, number>> = {
  hit_light: 0.5, hit_heavy: 0.8, blocked: 0.5, dodge: 0.4, special: 0.8, hurt: 0.7,
  enemy_down: 0.7, boss_phase: 1, victory: 0.8, defeat: 0.8, ui_tap: 0.4,
};
export const MUSIC_VOLUME = 0.45;