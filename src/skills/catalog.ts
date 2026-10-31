import { BLOCK_REDUCTION, SPECIAL_COST } from '../engine/constants';
import { MIN_SPECIAL_COST, Perks } from '../engine/perks';

export type Branch = 'offense' | 'defense' | 'special';

export interface SkillDef {
  id: string; name: string; branch: Branch; maxRank: number;
  key: keyof Perks;                 // which bonus this skill raises
  perRank: number;                  // how much each rank adds
  text: (rank: number) => string;   // what a given rank does
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** Every bonus is small on purpose. Skills are earned with XP and can never be bought. */
export const SKILLS: SkillDef[] = [
  { id: 'keen_edge', name: 'Keen Edge', branch: 'offense', maxRank: 5, key: 'damage', perRank: 0.03,
    text: (r) => `+${pct(0.03 * r)} attack damage` },
  { id: 'focus', name: 'Focus', branch: 'offense', maxRank: 3, key: 'energyGain', perRank: 0.1,
    text: (r) => `+${pct(0.1 * r)} energy from hits` },
  { id: 'vitality', name: 'Vitality', branch: 'defense', maxRank: 5, key: 'maxHp', perRank: 4,
    text: (r) => `+${4 * r} max health` },
  { id: 'guard', name: 'Guard', branch: 'defense', maxRank: 3, key: 'blockReduction', perRank: 0.02,
    text: (r) => `Blocks stop ${Math.round((BLOCK_REDUCTION + 0.02 * r) * 100)}% of damage` },
  { id: 'evasion', name: 'Evasion', branch: 'defense', maxRank: 3, key: 'dodgeInvuln', perRank: 0.02,
    text: (r) => `+${Math.round(0.02 * r * 1000)} ms dodge protection` },
  { id: 'surge', name: 'Surge', branch: 'special', maxRank: 3, key: 'specialCostDown', perRank: 4,
    text: (r) => `Special costs ${Math.max(MIN_SPECIAL_COST, SPECIAL_COST - 4 * r)} energy` },
  { id: 'power', name: 'Power', branch: 'special', maxRank: 3, key: 'specialDamage', perRank: 0.1,
    text: (r) => `+${pct(0.1 * r)} special damage` },
];

export const BRANCHES: { id: Branch; label: string }[] = [
  { id: 'offense', label: 'OFFENSE' }, { id: 'defense', label: 'DEFENSE' }, { id: 'special', label: 'SPECIAL' },
];

const byId = new Map(SKILLS.map((s) => [s.id, s]));
export const getSkill = (id: string): SkillDef | undefined => byId.get(id);

export const spentPoints = (ranks: Record<string, number>): number =>
  Object.values(ranks).reduce((s, r) => s + r, 0);