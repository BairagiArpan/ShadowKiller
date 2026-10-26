import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { ItemKind } from '../cosmetics/types';
import { PurchaseResult, equipItem, purchaseItem } from '../economy/shop';
import { RewardBreakdown, LevelResult, applyResult } from '../levels/progress';
import type { LevelConfig } from '../levels/types';
import { SaveData, Settings, defaultSave, sanitizeSettings } from './saveData';
import { loadSave, persistSave } from './storage';

interface SaveCtx {
  save: SaveData;
  recordResult: (cfg: LevelConfig, result: LevelResult, challenge: boolean) => RewardBreakdown;
  purchase: (kind: ItemKind, id: string) => PurchaseResult;
  equip: (kind: ItemKind, id: string) => boolean;
  /** Merges a partial settings change, validates it and persists it. */
  updateSettings: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<SaveCtx | null>(null);

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [save, setSave] = useState<SaveData | null>(null);
  const latest = useRef<SaveData>(defaultSave());

  useEffect(() => {
    let alive = true;
    loadSave().then((s) => { if (alive) { latest.current = s; setSave(s); } });
    return () => { alive = false; };
  }, []);

  const commit = useCallback((next: SaveData) => {
    latest.current = next;
    setSave(next);
    persistSave(next);
  }, []);

  const recordResult = useCallback((cfg: LevelConfig, result: LevelResult, challenge: boolean) => {
    const out = applyResult(latest.current, cfg, result, challenge);
    commit(out.save);
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

  if (!save) {
    return (
      <View style={{ flex: 1, backgroundColor: '#05050a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#7a2cff" />
      </View>
    );
  }
  return <Ctx.Provider value={{ save, recordResult, purchase, equip, updateSettings }}>{children}</Ctx.Provider>;
}

export function useSave(): SaveCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSave must be used inside <SaveProvider>');
  return v;
}