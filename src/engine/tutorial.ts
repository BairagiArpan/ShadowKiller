import { MAX_ENERGY } from './constants';
import type { Arena, Stats } from './types';

export interface TutorialStep {
  id: string;
  prompt: string;
  enemyActive: boolean;            // false = harmless training dummy
  setup?: (a: Arena) => void;
  isDone: (delta: Stats) => boolean; // delta = stats gained since the step began
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'move', prompt: 'Move with ◀ ▶ and tap JUMP', enemyActive: false,
    isDone: (d) => d.distance >= 150 && d.jumps >= 1 },
  { id: 'light', prompt: 'Tap ATK to strike the dummy', enemyActive: false,
    isDone: (d) => d.hits >= 1 },
  { id: 'combo', prompt: 'Tap ATK three times in a row for a combo finisher', enemyActive: false,
    isDone: (d) => d.chain3 >= 1 },
  { id: 'heavy', prompt: 'Land a HEAVY attack', enemyActive: false,
    isDone: (d) => d.heavyHits >= 1 },
  { id: 'block', prompt: 'Hold BLOCK as the enemy strikes (block 2 hits)', enemyActive: true,
    isDone: (d) => d.blocks >= 2 },
  { id: 'dodge', prompt: 'Tap DODGE when the enemy flashes yellow (2 times)', enemyActive: true,
    isDone: (d) => d.dodges >= 2 },
  { id: 'special', prompt: 'Energy is full. Tap SPECIAL!', enemyActive: false,
    setup: (a) => { a.energy = MAX_ENERGY; },
    isDone: (d) => d.specials >= 1 },
];

export function statsDelta(now: Stats, base: Stats): Stats {
  const out = { ...now };
  (Object.keys(out) as (keyof Stats)[]).forEach((k) => { out[k] = now[k] - base[k]; });
  return out;
}

export function enterTutorialStep(a: Arena): void {
  const t = a.tutorial;
  if (!t) return;
  const step = TUTORIAL_STEPS[t.index];
  t.base = { ...a.stats };
  a.passive = !step.enemyActive;
  a.player.hp = a.player.maxHp;
  for (const e of a.enemies) e.hp = e.maxHp;
  step.setup?.(a);
}

export function updateTutorial(a: Arena): void {
  const t = a.tutorial;
  if (!t || t.done) return;
  if (!TUTORIAL_STEPS[t.index].isDone(statsDelta(a.stats, t.base))) return;
  t.index += 1;
  if (t.index >= TUTORIAL_STEPS.length) { t.done = true; a.over = 'victory'; return; }
  enterTutorialStep(a);
}