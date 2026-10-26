import { createAudioPlayer } from 'expo-audio';
import type { PlayerFactory, PlayerLike } from './backend';

/**
 * Adapts an expo-audio player to PlayerLike. API assumptions (check against your SDK's docs if this errors):
 * createAudioPlayer(source), player.play(), player.pause(), player.seekTo(seconds),
 * player.loop, player.volume, and a release() or remove() method to free the player.
 */
export const expoFactory: PlayerFactory = (source: unknown): PlayerLike => {
  const p = createAudioPlayer(source as never);
  return {
    play: () => p.play(),
    pause: () => p.pause(),
    seekTo: (s: number) => p.seekTo(s),
    get loop() { return p.loop; },
    set loop(v: boolean) { p.loop = v; },
    get volume() { return p.volume; },
    set volume(v: number) { p.volume = v; },
    release: () => {
      const q = p as unknown as { release?: () => void; remove?: () => void };
      (q.release ?? q.remove)?.call(q);
    },
  };
};