export type ArenaParams =
  | { mode: 'tutorial' }
  | { mode: 'level'; world: number; level: number; challenge?: boolean };

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Worlds: undefined;
  Levels: { world: number };
  Arena: ArenaParams;
  Characters: undefined;
  Weapons: undefined;
  Settings: undefined;
};