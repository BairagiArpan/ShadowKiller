import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/navigation/types';
import { SaveProvider, useSave } from './src/persistence/SaveProvider';
import { configureAudio } from './src/audio/audio';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import WorldSelectScreen from './src/screens/WorldSelectScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';
import ArenaScreen from './src/screens/ArenaScreen';
import ShopScreen from './src/screens/ShopScreen';
import SettingsScreen from './src/screens/SettingScreen'; // Updated import to local componentC
import {initAudio} from './src/audio/initAudio';


const Stack = createNativeStackNavigator<RootStackParamList>();9

/** Keeps the audio module in step with the saved sound and music settings. */
function AudioSync() {
  const { save } = useSave();
  const { sound, music } = save.settings;
  useEffect(() => { configureAudio({ sound, music }); }, [sound, music]);
  return null;
}

export default function App() {
    useEffect(() => { initAudio(); }, []);
  return (
    <SaveProvider>
      <AudioSync />
      <NavigationContainer theme={DarkTheme}>
        <StatusBar hidden />
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Worlds" component={WorldSelectScreen} />
          <Stack.Screen name="Levels" component={LevelSelectScreen} />
          <Stack.Screen name="Characters" component={ShopScreen} />
          <Stack.Screen name="Weapons" component={ShopScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Arena" component={ArenaScreen} />       
        </Stack.Navigator>
      </NavigationContainer>
    </SaveProvider>
  );
}