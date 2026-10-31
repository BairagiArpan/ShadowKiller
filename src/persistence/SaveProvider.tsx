import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import {
  AchievementClaim, applyRunStats, claimAchievement as claimAchievementReward,
} from '../achievements/progress';
import type { ItemKind } from '../cosmetics/types';
import type { Stats } from '../engine/types';
import { DailyClaim, claimDaily as claimDailyReward, observeClock, resetClockLock as resetLock } from '../economy/daily';
import { PurchaseResult, equipItem, purchaseItem } from '../economy/shop';
import { RewardBreakdown, LevelResult, applyResult } from '../levels/progress';
import type { LevelConfig } from '../levels/types';
import { SaveData, Settings, defaultSave, sanitizeSettings } from './saveData';
import { loadSave, persistSave } from './storage';
import { RankUpResult, awardXp, rankUp, resetSkills as resetSkillsLogic } from '../skills/progress';
import {
  GearResult, buyFighter as buyFighterLogic, buyGear as buyGearLogic, equipGear as equipGearLogic,
  selectFighter as selectFighterLogic, unequipGear as unequipGearLogic, upgradeGear as upgradeGearLogic,
} from '../gear/progress';
import type { ArmorSlot } from '../gear/catalog';

interface SaveCtx {
  save: SaveData;
  /** Applies a finished run: level reward, stars, unlocks and lifetime stats. Call once per run (wins AND defeats). */
  recordResult: (cfg: LevelConfig, result: LevelResult, challenge: boolean, stats?: Stats) => RewardBreakdown;
  purchase: (kind: ItemKind, id: string) => PurchaseResult;
  equip: (kind: ItemKind, id: string) => boolean;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Uses the device clock. Refused during the cooldown or when the clock moved backwards. */
  claimDaily: () => DailyClaim;
  /** Escape hatch for an honestly wrong clock. Costs the streak. */
  resetClockLock: () => boolean;
  claimAchievement: (id: string) => AchievementClaim;
  rankUpSkill: (id: string) => RankUpResult;
  resetSkills: () => boolean;
  buyGear: (id: string) => GearResult;
  upgradeGear: (id: string) => GearResult;
  equipGear: (id: string) => boolean;
  unequipGear: (slot: ArmorSlot) => boolean;
  buyFighter: (id: string) => GearResult;
  selectFighter: (id: string) => boolean;
}

const Ctx = createContext<SaveCtx | null>(null);

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [save, setSave] = useState<SaveData | null>(null);
  const latest = useRef<SaveData>(defaultSave());

  const commit = useCallback((next: SaveData) => {
    latest.current = next;
    setSave(next);
    persistSave(next);
  }, []);

  useEffect(() => {
    let alive = true;
    loadSave().then((s) => {
      if (!alive) return;
      const seen = observeClock(s, Date.now()); // remember the latest time seen
      latest.current = seen;
      setSave(seen);
      if (seen !== s) persistSave(seen);
    });
    return () => { alive = false; };
  }, []);

  // Coming back to the app also records the time, so a clock jump in between is noticed.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const next = observeClock(latest.current, Date.now());
      if (next !== latest.current) commit(next);
    });
    return () => sub.remove();
  }, [commit]);

  const recordResult = useCallback((cfg: LevelConfig, result: LevelResult, challenge: boolean, stats?: Stats) => {
    const out = applyResult(latest.current, cfg, result, challenge);
    let next = stats ? applyRunStats(out.save, stats, result.won) : out.save;
    if (result.won) next = awardXp(next, out.reward.total);
    if (next !== latest.current) commit(next);
    return out.reward;
  }, [commit]);

  const purchase = useCallback((kind: ItemKind, id: string): PurchaseResult => {
    const out = purchaseItem(latest.current, kind, id);
    if (out.result.ok) commit(out.save);
    return out.result;
  }, [commit]);

  const equip = useCallback((kind: ItemKind, id: string): boolean => {
    const out = equipItem(latest.current, kind, id);
    if (out.ok && out.save !== latest.current) commit(out.save);
    return out.ok;
  }, [commit]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const settings = sanitizeSettings({ ...latest.current.settings, ...patch });
    commit({ ...latest.current, settings });
  }, [commit]);

  const claimDaily = useCallback((): DailyClaim => {
    const out = claimDailyReward(latest.current, Date.now());
    if (out.result.ok) commit(out.save);
    return out.result;
  }, [commit]);

  const resetClockLock = useCallback((): boolean => {
    const out = resetLock(latest.current, Date.now());
    if (out.ok) commit(out.save);
    return out.ok;
  }, [commit]);

  const claimAchievement = useCallback((id: string): AchievementClaim => {
    const out = claimAchievementReward(latest.current, id);
    if (out.result.ok) commit(out.save);
    return out.result;
  }, [commit]);


  const rankUpSkill = useCallback((id: string): RankUpResult => {
    const out = rankUp(latest.current, id);
    if (out.result.ok) commit(out.save);
    return out.result;
  }, [commit]);

  const resetSkills = useCallback((): boolean => {
    const out = resetSkillsLogic(latest.current);
    if (out.ok) commit(out.save);
    return out.ok;
  }, [commit]);

    const buyGear = useCallback((id: string): GearResult => {
    const out = buyGearLogic(latest.current, id);
    if (out.result.ok) commit(out.save);
    return out.result;
  }, [commit]);
  const upgradeGear = useCallback((id: string): GearResult => {
    const out = upgradeGearLogic(latest.current, id);
    if (out.result.ok) commit(out.save);
    return out.result;
  }, [commit]);
  const buyFighter = useCallback((id: string): GearResult => {
    const out = buyFighterLogic(latest.current, id);
    if (out.result.ok) commit(out.save);
    return out.result;
  }, [commit]);
  const equipGear = useCallback((id: string): boolean => {
    const out = equipGearLogic(latest.current, id);
    if (out.ok && out.save !== latest.current) commit(out.save);
    return out.ok;
  }, [commit]);
  const unequipGear = useCallback((slot: ArmorSlot): boolean => {
    const out = unequipGearLogic(latest.current, slot);
    if (out.ok) commit(out.save);
    return out.ok;
  }, [commit]);
  const selectFighter = useCallback((id: string): boolean => {
    const out = selectFighterLogic(latest.current, id);
    if (out.ok && out.save !== latest.current) commit(out.save);
    return out.ok;
  }, [commit]);

  if (!save) {
    return (
      <View style={{ flex: 1, backgroundColor: '#05050a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#7a2cff" />
      </View>
    );
  }
  return (
    <Ctx.Provider value={{ save, recordResult, purchase, equip, updateSettings, claimDaily, resetClockLock, claimAchievement, rankUpSkill, resetSkills, buyGear, upgradeGear, buyFighter, equipGear, unequipGear, selectFighter }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSave(): SaveCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSave must be used inside <SaveProvider>');
  return v;
}