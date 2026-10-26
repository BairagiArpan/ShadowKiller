import type { AmbientStyle } from '../engine/particles';

export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export const QUALITY_ORDER: Quality[] = ['low', 'medium', 'high', 'ultra'];

export interface GraphicsPreset {
  label: string; description: string;
  ambient: number;      // ambient particles drawn (embers, snow, ...)
  impactPerHit: number; // hit particles per hit
  impactCap: number;    // size of the hit-particle pool
  parallax: number;     // background layers (1..3)
  glow: boolean;        // weapon halo shapes
  fog: boolean;         // placeholder fog band
  hitFx: boolean;       // weapon-specific hit effect (rings, crossed slashes, ...)
}

/** Presets only reduce effects. There is no render-resolution scaling. */
export const PRESETS: Record<Quality, GraphicsPreset> = {
  low:    { label: 'Low',    description: 'Fewest effects. Best for older phones.',        ambient: 0,  impactPerHit: 5,  impactCap: 24,  parallax: 1, glow: false, fog: false, hitFx: false },
  medium: { label: 'Medium', description: 'Balanced. A good default for mid-range phones.', ambient: 16, impactPerHit: 9,  impactCap: 48,  parallax: 2, glow: false, fog: false, hitFx: true },
  high:   { label: 'High',   description: 'Full backgrounds, glow and fog.',                ambient: 36, impactPerHit: 13, impactCap: 80,  parallax: 3, glow: true,  fog: true,  hitFx: true },
  ultra:  { label: 'Ultra',  description: 'Maximum particles. For strong phones.',          ambient: 64, impactPerHit: 18, impactCap: 120, parallax: 3, glow: true,  fog: true,  hitFx: true },
};

export const WORLD_AMBIENT: AmbientStyle[] = ['motes', 'ash', 'snow', 'embers', 'void'];
export const ambientStyleFor = (world: number): AmbientStyle => WORLD_AMBIENT[world - 1] ?? 'motes';

export const AMBIENT_LOOK: Record<AmbientStyle, { color: string; size: number; opacity: number }> = {
  motes:  { color: '#cfd6ff', size: 2.5, opacity: 0.55 },
  ash:    { color: '#ff9a8a', size: 2.5, opacity: 0.5 },
  snow:   { color: '#ffffff', size: 3,   opacity: 0.8 },
  embers: { color: '#ffb04d', size: 3,   opacity: 0.85 },
  void:   { color: '#c04bff', size: 3,   opacity: 0.7 },
};

export function lowerQuality(q: Quality): Quality {
  return QUALITY_ORDER[Math.max(0, QUALITY_ORDER.indexOf(q) - 1)];
}