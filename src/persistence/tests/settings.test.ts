import { defaultSave, defaultSettings, sanitizeSave, sanitizeSettings } from '../saveData';
import { it, expect, describe } from '@jest/globals';

describe('settings', () => {
  it('has sensible defaults', () => {
    expect(defaultSettings()).toEqual({ sound: true, music: true, graphics: 'medium', fps: 60, language: 'en', controlSize: 1 });
  });
  it('replaces invalid values with defaults and clamps the control size', () => {
    const s = sanitizeSettings({ sound: 'yes', music: false, graphics: 'ultra-max', fps: 45, language: 'xx', controlSize: 9 });
    expect(s).toEqual({ sound: true, music: false, graphics: 'medium', fps: 60, language: 'en', controlSize: 1.3 });
  });
  it('keeps valid values', () => {
    const s = sanitizeSettings({ sound: false, music: true, graphics: 'low', fps: 30, controlSize: 0.85 });
    expect(s).toEqual({ sound: false, music: true, graphics: 'low', fps: 30, language: 'en', controlSize: 0.85 });
  });
  it('survives garbage and NaN', () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
    expect(sanitizeSettings('x')).toEqual(defaultSettings());
    expect(sanitizeSettings({ controlSize: NaN }).controlSize).toBe(1);
  });
  it('is part of the save, and old saves without settings get the defaults', () => {
    expect(defaultSave().settings).toEqual(defaultSettings());
    const old = sanitizeSave({ version: 2, coins: 5 });
    expect(old.version).toBe(3);
    expect(old.settings).toEqual(defaultSettings());
  });
  it('survives a JSON round trip', () => {
    const s = { ...defaultSave(), settings: { ...defaultSettings(), graphics: 'ultra' as const, fps: 30 as const } };
    expect(sanitizeSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});