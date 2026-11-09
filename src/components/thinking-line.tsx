import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAppearance } from '@/lib/appearance';

type Props = {
  text: string;
};

/** Same thinking line as the Kinetic console: an orbiting mark and a phrase the light travels through. */
export function ThinkingLine({ text }: Props) {
  const { scheme } = useAppearance();
  const light = scheme === 'light';
  const base = light ? '#a1a1a6' : '#9AA0AA';
  const shine = light ? '#1c1c1e' : '#F2F3F5';
  const line = text.endsWith('…') ? text : `${text}…`;
  const sweep = useSharedValue(0);
  const enter = useSharedValue(0);

  useEffect(() => {
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    enter.value = 0;
    enter.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [enter, line, sweep]);

  const row = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 7 }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -220 + sweep.value * 440 }],
  }));

  return (
    <Animated.View accessibilityRole="text" style={[styles.row, row]}>
      <OrbitMark color={shine} />
      <MaskedView style={styles.phrase} maskElement={<Text style={styles.mask}>{line}</Text>}>
        <Text style={[styles.mask, styles.sizer]}>{line}</Text>
        <View style={[styles.fill, { backgroundColor: base }]} />
        <Animated.View style={[styles.band, shineStyle]}>
          <LinearGradient
            colors={[base, base, shine, base, base]}
            locations={[0, 0.38, 0.5, 0.62, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.bandFill}
          />
        </Animated.View>
      </MaskedView>
    </Animated.View>
  );
}

function OrbitMark({ color }: { color: string }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
  }, [turn]);
  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 360}deg` }],
  }));
  return (
    <Animated.View style={[styles.mark, spin]}>
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <View
          key={angle}
          style={[styles.dot, { backgroundColor: color, transform: [{ rotate: `${angle}deg` }, { translateY: -6 }] }]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 24,
    overflow: 'visible',
  },
  phrase: { flexShrink: 1 },
  mask: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    color: '#000',
  },
  sizer: { opacity: 0 },
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#a1a1a6',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 220,
  },
  bandFill: { flex: 1 },
  mark: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
  },
});
