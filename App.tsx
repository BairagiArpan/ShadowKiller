
import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

import { RootStackParamList } from './src/navigation/types';
import { SaveProvider, useSave } from './src/persistence/SaveProvider';
import { configureAudio } from './src/audio/audio';
import { initAudio } from './src/audio/initAudio';

import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import WorldSelectScreen from './src/screens/WorldSelectScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';
import ArenaScreen from './src/screens/ArenaScreen';
import ShopScreen from './src/screens/ShopScreen';
import SettingsScreen from './src/screens/SettingScreen';
import DailyScreen from './src/screens/DailyScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SkillsScreen from './src/screens/SkillsScreen';
import GearScreen from './src/screens/GearScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Keeps audio synchronized with saved settings. */
function AudioSync() {
  const { save } = useSave();
  const { sound, music, soundVolume, musicVolume } = save.settings;

  useEffect(() => {
    configureAudio({
      sound,
      music,
      soundVolume,
      musicVolume,
    });
  }, [sound, music, soundVolume, musicVolume]);

  return null;
}

export default function App() {
  useEffect(() => {
    initAudio();

    async function setGameOrientation() {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } catch (error) {
        console.warn('Could not lock screen orientation:', error);
      }
    }

    setGameOrientation();
  }, []);

  return (
    <SaveProvider>
      <AudioSync />

      <NavigationContainer theme={DarkTheme}>
        <StatusBar hidden />

        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Worlds" component={WorldSelectScreen} />
          <Stack.Screen name="Levels" component={LevelSelectScreen} />
          <Stack.Screen name="Characters" component={ShopScreen} />
          <Stack.Screen name="Weapons" component={ShopScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Daily" component={DailyScreen} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          <Stack.Screen name="Skills" component={SkillsScreen} />
          <Stack.Screen name="Gear" component={GearScreen} />
          <Stack.Screen name="Arena" component={ArenaScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SaveProvider>
  );
}
