import { Vibration } from 'react-native';
import { hapticMs, shouldBuzz } from './controlsLogic';

let last = 0;

/** Short vibration for a game event. Never throws. */
export function buzz(ev: string): void {
  const ms = hapticMs(ev);
  if (ms <= 0) return;
  const now = Date.now();
  if (!shouldBuzz(last, now)) return;
  last = now;
  try {
    Vibration.vibrate(ms);
  } catch {
    // vibration is optional; ignore failures
  }
}