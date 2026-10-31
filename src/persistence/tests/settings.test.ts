import { defaultSave, defaultSettings, sanitizeSave, sanitizeSettings } from '../saveData';
import { describe, expect, it } from '@jest/globals';

const D = {
  sound: true, music: true, soundVolume: 1, musicVolume: 1, vibration: true,
  graphics: 'medium', fps: 60, language: 'en', controls: 'buttons', controlSize: 1,
};

describe('settings', () => {
  it('has sensible defaults', () => {
    expect(defaultSettings()).toEqual(D);
  });
  it('replaces invalid values with defaults and clamps ranges', () => {
    const s = sanitizeSettings({
      sound: 'yes', music: false, soundVolume: 7, musicVolume: 'loud', vibration: 1,
      graphics: 'ultra-max', fps: 45, language: 'xx', controls: 'gamepad', controlSize: 9,
    });
    expect(s).toEqual({ ...D, music: false, controlSize: 1.3 });
  });
  it('keeps valid values', () => {
    const s = sanitizeSettings({
      sound: false, music: true, soundVolume: 0.35, musicVolume: 0.5, vibration: false,
      graphics: 'low', fps: 30, controls: 'joystick', controlSize: 0.85,
    });
    expect(s).toEqual({
      sound: false, music: true, soundVolume: 0.35, musicVolume: 0.5, vibration: false,
      graphics: 'low', fps: 30, language: 'en', controls: 'joystick', controlSize: 0.85,
    });
  });
  it('rounds volumes to 5% steps and clamps them', () => {
    expect(sanitizeSettings({ soundVolume: 0.52 }).soundVolume).toBe(0.5);
    expect(sanitizeSettings({ soundVolume: 0.53 }).soundVolume).toBe(0.55);
    expect(sanitizeSettings({ musicVolume: -3 }).musicVolume).toBe(0);
    expect(sanitizeSettings({ musicVolume: 3 }).musicVolume).toBe(1);
  });
  it('survives garbage and NaN', () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
    expect(sanitizeSettings('x')).toEqual(defaultSettings());
    expect(sanitizeSettings({ controlSize: NaN }).controlSize).toBe(1);
    expect(sanitizeSettings({ soundVolume: NaN }).soundVolume).toBe(1);
  });
  it('is part of the save, and old saves without the new fields get the defaults', () => {
    expect(defaultSave().settings).toEqual(defaultSettings());
    const old = sanitizeSave({ version: 2, coins: 5 });
    expect(old.version).toBe(4);
    expect(old.settings).toEqual(defaultSettings());
    const half = sanitizeSave({ settings: { sound: false, graphics: 'low' } });
    expect(half.settings.sound).toBe(false);
    expect(half.settings.soundVolume).toBe(1);
    expect(half.settings.controls).toBe('buttons');
  });
  it('survives a JSON round trip', () => {
    const s = { ...defaultSave(), settings: { ...defaultSettings(), graphics: 'ultra' as const, fps: 30 as const, controls: 'joystick' as const } };
    expect(sanitizeSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});