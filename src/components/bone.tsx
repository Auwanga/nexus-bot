import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { useAppearance } from '@/lib/appearance';

const pulse = new Animated.Value(0.45);
let pulsing = false;

function startPulse() {
  if (pulsing) return;
  pulsing = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true }),
    ]),
  ).start();
}

type Props = {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** A pulsing placeholder block. Pages share one pulse so the layout breathes together. */
export function Bone({ width, height, radius = 8, style }: Props) {
  const { ink } = useAppearance();
  useEffect(() => {
    startPulse();
  }, []);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: ink.backgroundSelected, opacity: pulse }, style]}
    />
  );
}
