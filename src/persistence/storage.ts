import AsyncStorage from '@react-native-async-storage/async-storage';
import { SaveData, defaultSave, sanitizeSave } from './saveData';

const KEY = 'shadowkiller.save.v1'; // key name kept so Phase 5 progress is not abandoned
const CORRUPT_KEY = 'shadowkiller.save.v1.corrupt';

export async function loadSave(): Promise<SaveData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultSave();
    try {
      return sanitizeSave(JSON.parse(raw));
    } catch {
      await AsyncStorage.setItem(CORRUPT_KEY, raw); // keep the broken data for debugging
      return defaultSave();
    }
  } catch (e) {
    console.warn('Could not read save', e);
    return defaultSave();
  }
}

// Writes run one after another so two quick saves can never land out of order.
let queue: Promise<void> = Promise.resolve();

export function persistSave(save: SaveData): Promise<void> {
  const json = JSON.stringify(save);
  queue = queue.then(async () => {
    try {
      await AsyncStorage.setItem(KEY, json);
    } catch (e) {
      console.warn('Could not write save', e);
    }
  });
  return queue;
}