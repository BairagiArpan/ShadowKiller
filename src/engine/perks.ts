import { BLOCK_REDUCTION, SPECIAL_COST } from './constants';

/** Player bonuses from skills and gear. NO_PERKS reproduces the original behaviour exactly. */
export interface Perks {
  damage: number;          // multiplier on light and heavy attacks
  maxHp: number;           // added to the player's max health
  energyGain: number;      // multiplier on energy gained from hits
  blockReduction: number;  // fraction of damage a block prevents
  dodgeInvuln: number;     // extra seconds of dodge invulnerability
  specialCostDown: number; // energy taken off the special's cost
  specialDamage: number;   // multiplier on special damage
  damageTaken: number;     // multiplier on damage the player takes (1 = normal, lower = tougher)
  moveSpeed: number;       // multiplier on walking speed
  reach: number;           // multiplier on the player's attack reach
}

export const NO_PERKS: Perks = {
  damage: 1, maxHp: 0, energyGain: 1, blockReduction: BLOCK_REDUCTION,
  dodgeInvuln: 0, specialCostDown: 0, specialDamage: 1, damageTaken: 1, moveSpeed: 1, reach: 1,
};

export const MIN_SPECIAL_COST = 30;

export function specialCostFor(p: Perks): number {
  return Math.max(MIN_SPECIAL_COST, SPECIAL_COST - p.specialCostDown);
}

/** Stacks two sets of bonuses (for example skills and gear). */
export function combinePerks(a: Perks, b: Perks): Perks {
  return {
    damage: a.damage * b.damage,
    maxHp: a.maxHp + b.maxHp,
    energyGain: a.energyGain * b.energyGain,
    blockReduction: Math.min(0.95, a.blockReduction + (b.blockReduction - BLOCK_REDUCTION)),
    dodgeInvuln: a.dodgeInvuln + b.dodgeInvuln,
    specialCostDown: a.specialCostDown + b.specialCostDown,
    specialDamage: a.specialDamage * b.specialDamage,
    damageTaken: a.damageTaken * b.damageTaken,
    moveSpeed: a.moveSpeed * b.moveSpeed,
    reach: Math.min(1.3, a.reach * b.reach),
  };
}