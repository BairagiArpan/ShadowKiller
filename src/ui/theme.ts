export const COLORS = {
  bg: '#07070d',
  panel: '#101019',
  panelBorder: '#2a2a3d',
  gold: '#f5a623',
  goldLight: '#ffd27a',
  text: '#e8e8f5',
  dim: '#8a8aa5',
  accent: '#7a2cff',
};

export type Variant = 'primary' | 'default' | 'danger' | 'info';

/** Text colours are chosen to stay readable on their button colour (a test checks this). */
export const VARIANTS: Record<Variant, { bg: string; border: string; text: string }> = {
  primary: { bg: '#f5a623', border: '#ffd27a', text: '#1b1206' },
  default: { bg: '#14141f', border: '#34344d', text: '#e8e8f5' },
  danger: { bg: '#a8202c', border: '#e0525e', text: '#ffffff' },
  info: { bg: '#1f3a5f', border: '#3f6aa0', text: '#ffffff' },
};