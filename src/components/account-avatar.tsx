import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemed, type Palette } from '@/lib/appearance';

type Props = {
  seed: string;
  size: number;
  fallback?: string;
};

/** DiceBear Notionists, an open-source portrait style, drawn large and scaled down so it stays sharp. */
export function AccountAvatar({ seed, size, fallback = 'K' }: Props) {
  const { styles } = useThemed(makeStyles);
  const [failed, setFailed] = useState(false);
  const pixels = Math.max(256, Math.round(size * 4));
  const uri = `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(seed || 'kinetic')}&size=${pixels}&backgroundColor=e8eef2`;

  if (failed) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{fallback.slice(0, 1).toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E8EEF2' }}
      contentFit="cover"
      cachePolicy="memory-disk"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
  fallback: { backgroundColor: ink.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  letter: { color: ink.text, fontWeight: '700' },
});
}
