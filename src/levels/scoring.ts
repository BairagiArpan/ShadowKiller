import type { Arena } from '../engine/types';
import type { LevelResult } from './progress';
import type { LevelConfig } from './types';

export interface RunSummary extends LevelResult { objectiveMet: boolean; hpFraction: number }

export function evaluateRun(cfg: LevelConfig, a: Arena): RunSummary {
  const won = a.over === 'victory';
  const hpFraction = Math.max(0, a.player.hp / a.player.maxHp);
  const o = cfg.objective;
  const objectiveMet = won && (
    o.kind === 'combo' ? a.stats.maxCombo >= o.target
    : o.kind === 'speed' ? a.time <= o.target
    : hpFraction >= o.target
  );
  const stars = !won ? 0 : 1 + (objectiveMet ? 1 : 0) + (objectiveMet && hpFraction >= 0.5 ? 1 : 0);
  const timeBonus = won ? Math.max(0, Math.round((cfg.parTime - a.time) * 5)) : 0;
  const score = a.stats.kills * 100 + (won ? a.stats.maxCombo * 25 + Math.round(hpFraction * 500) + timeBonus : 0);
  return { won, stars, score, objectiveMet, hpFraction };
}