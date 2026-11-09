import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Bloub, useBloubReady } from '@/components/bloub';

const HOLD_MS = 700;
const FADE_MS = 420;
const BLOUB_SIZE = 112;

type SplashProps = {
  onFinished?: () => void;
};

export function AnimatedSplashOverlay({ onFinished }: SplashProps) {
  const ready = useBloubReady('idle');
  const [visible, setVisible] = useState(true);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!ready || !visible) return;

    opacity.value = withDelay(
      HOLD_MS,
      withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(setVisible)(false);
          if (onFinished) runOnJS(onFinished)();
        }
      }),
    );
  }, [onFinished, opacity, ready, visible]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.splashOverlay, fadeStyle]}>
      {ready ? (
        <Bloub size={BLOUB_SIZE} color="#FFFFFF" eyeColor="#000000" mood="idle" />
      ) : null}
    </Animated.View>
  );
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Image style={styles.image} source={require('@/assets/images/icon.png')} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  image: {
    width: 128,
    height: 128,
    borderRadius: 28,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
