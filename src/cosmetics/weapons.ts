import type { HitFxStyle, WeaponShape, WeaponSkin, WeaponVisual } from './types';

const gear = (
  shape: WeaponShape, length: number, blade: string, handle: string, glow: string,
  trail: string, hitFx: HitFxStyle, hitColor: string,
): WeaponVisual => ({ shape, length, blade, handle, glow, trail, hitFx, hitColor });

/** The first entry is the default weapon. Glow is layered translucent shapes, not a real blur yet. */
export const WEAPONS: WeaponSkin[] = [
  { id: 'initiate_katana', name: 'Initiate Katana', rarity: 'common', free: true,
    blurb: 'A plain blade with a faint violet shimmer.', visual: gear('katana', 44, '#e6dcff', '#2a2030', '#bfa3ff', '#bfa3ff', 'spark', '#ffffff') },
  { id: 'rustfang_daggers', name: 'Rustfang Daggers', rarity: 'common', free: true,
    blurb: 'Old twin knives, still sharp.', visual: gear('daggers', 30, '#cfc7b8', '#4a3a28', '#ffcf8a', '#ffcf8a', 'spark', '#ffe2b0') },

  { id: 'ironbark_spear', name: 'Ironbark Spear', rarity: 'common',
    blurb: 'Cut from a lightning-struck tree.', visual: gear('spear', 52, '#d0d6dd', '#6b4a2a', '#9aa3b5', '#c9d1da', 'spark', '#ffffff') },
  { id: 'travelers_axe', name: "Traveler's Axe", rarity: 'common',
    blurb: 'Splits firewood and enemies alike.', visual: gear('axe', 40, '#b9c0c9', '#5a3d22', '#c9d1da', '#c9d1da', 'spark', '#fff2d0') },
  { id: 'twin_crescents', name: 'Twin Crescents', rarity: 'common',
    blurb: 'Paired blades that sing when swung.', visual: gear('dual', 40, '#d9d4f0', '#2a2030', '#9b8cff', '#9b8cff', 'slash', '#d9d4ff') },
  { id: 'ashen_staff', name: 'Ashen Staff', rarity: 'common',
    blurb: 'An ember glows in its head.', visual: gear('staff', 48, '#ff9a4d', '#5a4a3a', '#ff9a4d', '#ffb070', 'ember', '#ffcf8a') },
  { id: 'hunters_chain', name: "Hunter's Chain", rarity: 'common',
    blurb: 'A weighted chain with a barbed head.', visual: gear('chain', 46, '#c5ccd6', '#3a3f4a', '#9aa3b5', '#aab3c2', 'spark', '#ffffff') },

  { id: 'moonlit_katana', name: 'Moonlit Katana', rarity: 'rare',
    blurb: 'Its edge holds a sliver of moonlight.', visual: gear('katana', 46, '#bfe1ff', '#1c2a40', '#6fb7ff', '#6fb7ff', 'ring', '#bfe1ff') },
  { id: 'frostbite_daggers', name: 'Frostbite Daggers', rarity: 'rare',
    blurb: 'Cold enough to crack the air.', visual: gear('daggers', 32, '#d4f6ff', '#1c3a4a', '#6fd8ff', '#6fd8ff', 'frost', '#e8fbff') },
  { id: 'jade_lance', name: 'Jade Lance', rarity: 'rare',
    blurb: 'Carved from a single shrine stone.', visual: gear('spear', 54, '#9bffd4', '#14423a', '#3fe0a0', '#3fe0a0', 'spark', '#c8ffe9') },
  { id: 'crimson_reaper', name: 'Crimson Reaper', rarity: 'rare',
    blurb: 'A scythe that remembers every harvest.', visual: gear('scythe', 50, '#ff6a85', '#3a1018', '#ff3b5c', '#ff3b5c', 'slash', '#ff9aa8') },
  { id: 'stormcaller_staff', name: 'Stormcaller Staff', rarity: 'rare',
    blurb: 'Crackles before every strike.', visual: gear('staff', 50, '#ffe45c', '#3a3a1c', '#ffd93d', '#fff0a0', 'spark', '#fff6b0') },
  { id: 'serpent_chain', name: 'Serpent Chain', rarity: 'rare',
    blurb: 'Coils back to its owner.', visual: gear('chain', 48, '#8cf08a', '#1f3a22', '#4cd964', '#7be87a', 'slash', '#c8ffc6') },

  { id: 'emberblade', name: 'Emberblade', rarity: 'epic',
    blurb: 'A greatsword still cooling from the forge.', visual: gear('greatsword', 52, '#ffb06a', '#3d1405', '#ff7a1a', '#ff8c3a', 'ember', '#ffd08a') },
  { id: 'voidtwin_blades', name: 'Voidtwin Blades', rarity: 'epic',
    blurb: 'Two edges, one hunger.', visual: gear('dual', 44, '#d9a8ff', '#120826', '#c04bff', '#c04bff', 'ring', '#7ff3ff') },
  { id: 'shadow_scythe', name: 'Shadow Scythe', rarity: 'epic',
    blurb: 'Cuts the shadow from the body.', visual: gear('scythe', 54, '#b78cff', '#120826', '#7a2cff', '#9a5cff', 'ring', '#d9c8ff') },
  { id: 'sunsplitter_axe', name: 'Sunsplitter Axe', rarity: 'epic',
    blurb: 'Gilded edge, blinding swing.', visual: gear('axe', 44, '#ffe08a', '#4a3410', '#ffd24a', '#ffe28a', 'ember', '#fff3b8') },

  { id: 'eclipse_katana', name: 'Eclipse Katana', rarity: 'legendary',
    blurb: 'A black blade rimmed in golden fire.', visual: gear('katana', 52, '#fff0b0', '#1a1208', '#ffb524', '#ffcf5a', 'slash', '#ffffff') },
  { id: 'starfall_spear', name: 'Starfall Spear', rarity: 'legendary',
    blurb: 'Thrown once, it fell as a star.', visual: gear('spear', 56, '#e6f0ff', '#1c2550', '#9fb8ff', '#cfe0ff', 'ring', '#ffffff') },
  { id: 'soulchain_reaver', name: 'Soulchain Reaver', rarity: 'legendary',
    blurb: 'Every link holds a captured spirit.', visual: gear('chain', 52, '#ff7be6', '#2a0a2a', '#ff4dd2', '#ff7be6', 'slash', '#ffd0f4') },
];