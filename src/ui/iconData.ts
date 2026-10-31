export type IconName =
  | 'play' | 'pause' | 'back' | 'home' | 'star' | 'lock' | 'coin' | 'settings'
  | 'shop' | 'sound' | 'soundOff' | 'music' | 'check' | 'sword' | 'plus';

export interface IconPart { d: string; stroke?: boolean }

/** 24 x 24 grid. Original shapes made of straight lines. Fills are solid, strokes are round-capped lines. */
export const ICONS: Record<IconName, IconPart[]> = {
  play: [{ d: 'M7 4 L20 12 L7 20 Z' }],
  pause: [{ d: 'M6 4 H10 V20 H6 Z M14 4 H18 V20 H14 Z' }],
  back: [{ d: 'M15 4 L6 12 L15 20 L17 18 L11 12 L17 6 Z' }],
  home: [{ d: 'M12 3 L2 12 H5 V21 H10 V15 H14 V21 H19 V12 H22 Z' }],
  star: [{ d: 'M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z' }],
  lock: [{ d: 'M5 10 H19 V21 H5 Z' }, { d: 'M8 10 V7 L10 4 H14 L16 7 V10', stroke: true }],
  coin: [{ d: 'M9 3 H15 L21 9 V15 L15 21 H9 L3 15 V9 Z' }],
  settings: [
    { d: 'M9 5 H15 L19 9 V15 L15 19 H9 L5 15 V9 Z', stroke: true },
    { d: 'M10 10 H14 V14 H10 Z' },
    { d: 'M11 1 H13 V4 H11 Z M11 20 H13 V23 H11 Z M1 11 H4 V13 H1 Z M20 11 H23 V13 H20 Z' },
  ],
  shop: [{ d: 'M5 8 H19 L20 21 H4 Z' }, { d: 'M9 8 V6 L10.5 4 H13.5 L15 6 V8', stroke: true }],
  sound: [
    { d: 'M3 9 H7 L12 5 V19 L7 15 H3 Z' },
    { d: 'M15 9 L17 12 L15 15', stroke: true },
    { d: 'M18 6 L21 12 L18 18', stroke: true },
  ],
  soundOff: [{ d: 'M3 9 H7 L12 5 V19 L7 15 H3 Z' }, { d: 'M15 9 L21 15 M21 9 L15 15', stroke: true }],
  music: [{ d: 'M9 18 V5 L19 3 V16', stroke: true }, { d: 'M5 16 H10 V20 H5 Z M15 14 H20 V18 H15 Z' }],
  check: [{ d: 'M4 12 L10 18 L20 6', stroke: true }],
  sword: [
    { d: 'M5 19 L19 5', stroke: true },
    { d: 'M7 13 L11 17', stroke: true },
    { d: 'M3 21 L6 18', stroke: true },
  ],
  plus: [{ d: 'M12 4 V20 M4 12 H20', stroke: true }],
};

export const ICON_NAMES = Object.keys(ICONS) as IconName[];