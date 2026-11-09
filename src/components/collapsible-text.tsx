import { useId, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Type } from '@/constants/theme';
import { useThemed, type Palette } from '@/lib/appearance';
import {
  COLLAPSE_HEIGHT_PX,
  charLimitForWidth,
  collapseChoice,
  plainCharCount,
  rememberCollapse,
  shouldCollapseText,
} from '@/lib/message-collapse';

const BODY_LINE = 22;
const FADE_HEIGHT = 72;

type Props = {
  messageId: string;
  text: string;
  fade: string;
  labelColor?: string;
  children: ReactNode;
};

/** Clips a long text bubble to the same 280px window as the Kinetic console. */
export function CollapsibleText({ messageId, text, fade, labelColor, children }: Props) {
  const { styles } = useThemed(makeStyles);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = collapseChoice(messageId);
    if (saved !== undefined) return saved;
    return plainCharCount(text) > charLimitForWidth(320);
  });
  const [needs, setNeeds] = useState(
    () => collapseChoice(messageId) !== undefined || plainCharCount(text) > charLimitForWidth(320),
  );

  const fadeId = `collapse-${useId().replace(/:/g, '')}`;
  const clipped = needs && collapsed;

  function onLayout(height: number, width: number) {
    if (clipped) return;
    const over = shouldCollapseText({
      text,
      heightPx: height,
      lineCount: Math.round(height / BODY_LINE),
      contentWidthPx: width,
    });
    setNeeds(over || collapseChoice(messageId) !== undefined);
    if (collapseChoice(messageId) === undefined) setCollapsed(over);
  }

  function toggle() {
    const next = !collapsed;
    rememberCollapse(messageId, next);
    setCollapsed(next);
    setNeeds(true);
  }

  return (
    <View style={styles.wrap}>
      <View style={clipped ? styles.clip : undefined}>
        <View onLayout={(event) => onLayout(event.nativeEvent.layout.height, event.nativeEvent.layout.width)}>
          {children}
        </View>
        {clipped ? (
          <Svg pointerEvents="none" width="100%" height={FADE_HEIGHT} style={styles.fade}>
            <Defs>
              <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={fade} stopOpacity={0} />
                <Stop offset="0.45" stopColor={fade} stopOpacity={0.35} />
                <Stop offset="1" stopColor={fade} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height={FADE_HEIGHT} fill={`url(#${fadeId})`} />
          </Svg>
        ) : null}
      </View>
      {needs ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: !clipped }}
          accessibilityLabel={clipped ? 'Collapsed. Show more to read full message.' : 'Show less'}
          onPress={toggle}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
          <Text style={[styles.toggleLabel, labelColor ? { color: labelColor } : null]}>{clipped ? 'Show more' : 'Show less'}</Text>
          <Text style={[styles.chevron, labelColor ? { color: labelColor } : null]}>{clipped ? '▾' : '▴'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  clip: { maxHeight: COLLAPSE_HEIGHT_PX, overflow: 'hidden' },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE_HEIGHT,
  },
  toggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: { ...Type.meta, color: ink.textMuted },
  chevron: { ...Type.meta, color: ink.textMuted },
  pressed: { opacity: 0.7 },
});
}
