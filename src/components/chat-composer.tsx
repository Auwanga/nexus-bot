import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Space, Type } from '@/constants/theme';
import { useThemed, type Palette } from '@/lib/appearance';

const LINE = 22;
const INPUT_PAD = 11;
const MIN_TEXT = LINE;
const MAX_TEXT = LINE * 5;
const MIN_HEIGHT = 56;
const MAX_HEIGHT = MIN_HEIGHT + (MAX_TEXT - MIN_TEXT);
const GROW_MS = 180;

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accent: string;
  busy: boolean;
  bottomInset: number;
  onAttach: () => void;
  onMicrophone: () => void;
  onVoice: () => void;
  onSubmit: () => void;
  onHeight?: (height: number) => void;
};

export function ChatComposer({
  value,
  onChangeText,
  placeholder,
  accent,
  busy,
  bottomInset,
  onAttach,
  onMicrophone,
  onVoice,
  onSubmit,
  onHeight,
}: Props) {
  const { scheme, ink, styles } = useThemed(makeStyles);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [textHeight, setTextHeight] = useState(MIN_TEXT);
  const measured = useRef(MIN_TEXT);
  const pill = useSharedValue(MIN_HEIGHT);
  const sendMix = useSharedValue(value.trim() ? 1 : 0);
  const showSend = value.length > 0;
  const canSend = value.trim().length > 0 && !busy;
  const atMax = textHeight >= MAX_TEXT - 0.5;
  const duration = reduceMotion ? 0 : GROW_MS;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (value.length > 0) return;
    measured.current = MIN_TEXT;
    setTextHeight(MIN_TEXT);
  }, [value]);

  useEffect(() => {
    pill.value = withTiming(MIN_HEIGHT + (textHeight - MIN_TEXT), { duration });
  }, [duration, pill, textHeight]);

  useEffect(() => {
    sendMix.value = withTiming(showSend ? 1 : 0, { duration: reduceMotion ? 0 : 160 });
  }, [reduceMotion, sendMix, showSend]);

  const pillStyle = useAnimatedStyle(() => ({ height: pill.value }));
  const voiceStyle = useAnimatedStyle(() => ({ opacity: 1 - sendMix.value }));
  const sendStyle = useAnimatedStyle(() => ({ opacity: sendMix.value }));

  function onContentSizeChange(height: number) {
    const stripped = height - INPUT_PAD * 2;
    const text = stripped >= MIN_TEXT - 1 ? stripped : height;
    const next = Math.min(MAX_TEXT, Math.max(MIN_TEXT, text));
    if (Math.abs(next - measured.current) < 1) return;
    measured.current = next;
    setTextHeight(next);
  }

  return (
    <View
      onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)}
      style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <Animated.View style={[styles.shadow, scheme === 'dark' ? styles.shadowDark : styles.shadowLight, pillStyle]}>
        <View style={styles.pill}>
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
            onPress={onAttach}
            style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
            <View style={styles.plus}>
              <Icon ios="plus" android="add" size={18} color={ink.textMuted} />
            </View>
          </Pressable>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={ink.textMuted}
            style={[styles.input, { height: Math.max(44, textHeight + INPUT_PAD * 2) }]}
            multiline
            scrollEnabled={atMax}
            submitBehavior="newline"
            editable={!busy}
            textAlignVertical="top"
            onContentSizeChange={(event) => onContentSizeChange(event.nativeEvent.contentSize.height)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Microphone"
            onPress={onMicrophone}
            style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
            <Icon ios="mic" android="mic" size={20} color={ink.textMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showSend ? 'Send' : 'Voice'}
            accessibilityState={{ disabled: showSend && !canSend }}
            disabled={busy || (showSend && !canSend)}
            onPress={showSend ? onSubmit : onVoice}
            style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
            <View style={[styles.action, { backgroundColor: accent }]}>
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Animated.View style={[styles.actionIcon, voiceStyle]} pointerEvents="none">
                    <Icon ios="waveform" android="graphic_eq" size={18} color="#FFFFFF" />
                  </Animated.View>
                  <Animated.View style={[styles.actionIcon, sendStyle]} pointerEvents="none">
                    <Icon ios="arrow.up" android="arrow_upward" size={18} color="#FFFFFF" />
                  </Animated.View>
                </>
              )}
            </View>
          </Pressable>
        </View>
        </View>
      </Animated.View>
    </View>
  );
}

function Icon({
  ios,
  android,
  size,
  color,
}: {
  ios: SFSymbol;
  android: AndroidSymbol;
  size: number;
  color: string;
}) {
  return <SymbolView name={{ ios, android, web: android }} size={size} tintColor={color} weight="medium" />;
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
    wrap: {
      zIndex: 2,
      backgroundColor: 'transparent',
    },
    shadow: {
      marginHorizontal: Space[4],
      borderRadius: 28,
      backgroundColor: ink.surfaceRaised,
    },
    pill: {
      flex: 1,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: ink.border,
      backgroundColor: ink.surfaceRaised,
      overflow: 'hidden',
    },
    shadowLight: {
      shadowColor: '#111318',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    shadowDark: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 6,
    },
    row: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingLeft: Space[1],
      paddingRight: Space[1],
      paddingVertical: 6,
    },
    hit: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plus: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: ink.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      marginHorizontal: 2,
      paddingTop: INPUT_PAD,
      paddingBottom: INPUT_PAD,
      maxHeight: MAX_TEXT + INPUT_PAD * 2,
      ...Type.composer,
      color: ink.text,
    },
    action: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionIcon: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.7 },
  });
}
