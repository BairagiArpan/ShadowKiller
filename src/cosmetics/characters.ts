import type { CharacterFeature, CharacterSkin, CharacterVisual } from './types';

const look = (
  body: string, accent: string, trim: string, eye: string, features: CharacterFeature[],
  widthScale = 1, heightScale = 1, headScale = 1,
): CharacterVisual => ({ body, accent, trim, eye, features, widthScale, heightScale, headScale });

/** The first entry is the default character. PLACEHOLDER ART: layered shapes, not final artwork. */
export const CHARACTERS: CharacterSkin[] = [
  { id: 'shadow_initiate', name: 'Shadow Initiate', rarity: 'common', free: true,
    blurb: 'A novice of the shadow arts.', visual: look('#2d2350', '#7a2cff', '#bfa3ff', '#d9c8ff', ['hood']) },
  { id: 'dusk_wanderer', name: 'Dusk Wanderer', rarity: 'common', free: true,
    blurb: 'Travels roads no map shows.', visual: look('#2b4560', '#8fb4d9', '#d6e6f5', '#ffffff', ['scarf']) },

  { id: 'ash_courier', name: 'Ash Courier', rarity: 'common',
    blurb: 'Carries messages through burning towns.', visual: look('#4a4a52', '#ff8a3d', '#c9c9d1', '#ffcf8a', ['scarf', 'tail'], 0.95, 1.05) },
  { id: 'moss_hermit', name: 'Moss Hermit', rarity: 'common',
    blurb: 'Lives where the temples sank.', visual: look('#2f4a2c', '#9bd36b', '#d7e8b8', '#eaffc0', ['hat'], 1.05, 0.95, 1.1) },
  { id: 'rust_ronin', name: 'Rust Ronin', rarity: 'common',
    blurb: 'A masterless blade, long weathered.', visual: look('#5c3a24', '#c97a3a', '#e8c9a0', '#ffd9a8', ['hat', 'scarf']) },
  { id: 'ink_scribe', name: 'Ink Scribe', rarity: 'common',
    blurb: 'Writes names that are never spoken.', visual: look('#15151a', '#f2f2f2', '#8a8aa5', '#ffffff', ['mask'], 0.95, 1, 0.95) },
  { id: 'tide_drifter', name: 'Tide Drifter', rarity: 'common',
    blurb: 'Washed ashore with a grudge.', visual: look('#1f4d5c', '#37d0c4', '#a8f0ea', '#d4fffb', ['hood', 'tail'], 1, 1.05) },

  { id: 'crimson_fang', name: 'Crimson Fang', rarity: 'rare',
    blurb: 'Hunts by the scent of fear.', visual: look('#4a0f1a', '#e0334c', '#ff9aa8', '#ffd0d6', ['horns'], 1.05, 1, 1.1) },
  { id: 'frost_warden', name: 'Frost Warden', rarity: 'rare',
    blurb: 'Guardian of the frozen gates.', visual: look('#20384d', '#6fd8ff', '#e8fbff', '#ffffff', ['pauldrons', 'hood'], 1.1) },
  { id: 'jade_sentinel', name: 'Jade Sentinel', rarity: 'rare',
    blurb: 'Stands watch over forgotten shrines.', visual: look('#0f3d34', '#3fe0a0', '#c8ffe9', '#e8fff6', ['pauldrons', 'hat'], 1.1, 0.95) },
  { id: 'storm_courier', name: 'Storm Courier', rarity: 'rare',
    blurb: 'Rides the thunder between worlds.', visual: look('#3a3a1c', '#ffd93d', '#fff2a8', '#ffffff', ['spikes', 'tail'], 0.95, 1.1) },
  { id: 'bone_oracle', name: 'Bone Oracle', rarity: 'rare',
    blurb: 'Reads fate in the cracks of old bones.', visual: look('#c9c1ae', '#5b4f3a', '#2a241a', '#ff4d4d', ['mask', 'spikes'], 1, 1, 0.9) },
  { id: 'twilight_dancer', name: 'Twilight Dancer', rarity: 'rare',
    blurb: 'Every step is a duel.', visual: look('#4d1a52', '#ff5fd2', '#ffc2f0', '#ffffff', ['cape', 'tail'], 1, 1.05) },

  { id: 'lava_warlord', name: 'Lava Warlord', rarity: 'epic',
    blurb: 'Forged in the fortress furnaces.', visual: look('#3d1405', '#ff7a1a', '#ffd08a', '#fff0c0', ['horns', 'pauldrons'], 1.1, 1.05, 1.05) },
  { id: 'void_stalker', name: 'Void Stalker', rarity: 'epic',
    blurb: 'Steps out of the space between stars.', visual: look('#120826', '#c04bff', '#7ff3ff', '#7ff3ff', ['hood', 'halo'], 0.95, 1.1) },
  { id: 'obsidian_reaper', name: 'Obsidian Reaper', rarity: 'epic',
    blurb: 'Collects debts the dead still owe.', visual: look('#0b0b10', '#8a8aa5', '#ff3b5c', '#ff3b5c', ['cape', 'hood'], 1, 1.1) },
  { id: 'solar_monk', name: 'Solar Monk', rarity: 'epic',
    blurb: 'Carries a small sun in his palms.', visual: look('#6b4a10', '#ffd24a', '#fff3b8', '#ffffff', ['halo', 'pauldrons'], 1.05, 1, 1.1) },

  { id: 'eclipse_sovereign', name: 'Eclipse Sovereign', rarity: 'legendary',
    blurb: 'Rules the hour the sun goes dark.', visual: look('#1a1208', '#ffb524', '#fff0b0', '#ffffff', ['halo', 'cape', 'horns'], 1.1, 1.1, 1.05) },
  { id: 'nightmare_king', name: 'Nightmare King', rarity: 'legendary',
    blurb: 'Wears the crown of every bad dream.', visual: look('#2a0510', '#b3002a', '#ff6a85', '#ff2d55', ['horns', 'cape', 'spikes'], 1.1, 1.05, 1.1) },
  { id: 'starlit_empress', name: 'Starlit Empress', rarity: 'legendary',
    blurb: 'Her cloak is woven from fallen stars.', visual: look('#1c2550', '#9fb8ff', '#ffffff', '#e6f0ff', ['halo', 'cape', 'pauldrons'], 1, 1.1, 1.1) },
];