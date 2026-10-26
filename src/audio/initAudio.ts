import { setAudioModeAsync } from 'expo-audio';
import { setAudioBackend } from './audio';
import { MUSIC_SOURCES, MUSIC_VOLUME, SFX_SOURCES, SFX_VOLUME } from './assets';
import { createBackend } from './backend';
import { expoFactory } from './expoFactory';

let started = false;

/** Call once at startup. If anything fails the game simply stays silent. */
export async function initAudio(): Promise<void> {
  if (started) return;
  started = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch (e) {
    console.warn('audio mode not set', e);
  }
  try {
    setAudioBackend(createBackend(expoFactory, {
      sfx: SFX_SOURCES, music: MUSIC_SOURCES, sfxVolume: SFX_VOLUME, musicVolume: MUSIC_VOLUME,
    }));
  } catch (e) {
    console.warn('audio backend failed; staying silent', e);
  }
}