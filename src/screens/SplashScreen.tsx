import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => navigation.replace('Home'));
  }, [navigation, opacity]);

  return (
    <View style={styles.root}>
      <Animated.Text style={[styles.logo, { opacity }]}>SHADOW KILLER</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05050a', alignItems: 'center', justifyContent: 'center' },
  logo: {
    color: '#e8e8f5', fontSize: 48, fontWeight: '900', letterSpacing: 8,
    textShadowColor: '#7a2cff', textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 },
  },
});