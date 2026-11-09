/**
 * Kinetic mobile tokens from 19_MOBILE_UI_DESIGN.md §2.
 * System fonts only. No remote font files.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111318',
    background: '#FFFFFF',
    backgroundElement: '#F5F6F8',
    backgroundSelected: '#E4E6EB',
    textSecondary: '#6B7280',
    bg: '#FFFFFF',
    surface: '#F5F6F8',
    surfaceRaised: '#FFFFFF',
    border: '#E4E6EB',
    textMuted: '#6B7280',
    accent: '#2563EB',
    userBubble: '#2563EB',
    userBubbleText: '#FFFFFF',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    button: '#111318',
    buttonText: '#FFFFFF',
  },
  dark: {
    text: '#F2F3F5',
    background: '#0E0F12',
    backgroundElement: '#17191E',
    backgroundSelected: '#2A2D35',
    textSecondary: '#9AA0AA',
    bg: '#0E0F12',
    surface: '#17191E',
    surfaceRaised: '#1E2128',
    border: '#2A2D35',
    textMuted: '#9AA0AA',
    accent: '#5B8DEF',
    userBubble: '#2F4FA8',
    userBubbleText: '#FFFFFF',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#F87171',
    button: '#F2F3F5',
    buttonText: '#111318',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Spec spacing scale: 4, 8, 12, 16, 20, 24, 32. */
export const Space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

/** Kept for the Expo template components. */
export const Spacing = {
  half: 2,
  one: Space[1],
  two: Space[2],
  three: Space[4],
  four: Space[6],
  five: Space[8],
  six: 64,
} as const;

/** chip 999, bubble 18, card 14, sheet 20. */
export const Radius = {
  chip: 999,
  bubble: 18,
  card: 14,
  sheet: 20,
} as const;

export const Type = {
  caption: { fontSize: 11, lineHeight: 15 },
  meta: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 16, lineHeight: 22 },
  /** Chat bubbles / formatted message text — compact Kinetic size. */
  chat: { fontSize: 14, lineHeight: 20 },
  composer: { fontSize: 14, lineHeight: 20 },
  agentName: { fontSize: 14, lineHeight: 18, fontWeight: '600' as const },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
