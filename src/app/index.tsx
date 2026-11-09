import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WelcomeMarks } from '@/components/welcome-marks';
import { Radius, Space, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/lib/auth';

export default function WelcomeScreen() {
  const colors = useTheme();
  const scheme = useColorScheme();
  const { session, ready, configured } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (configured && session) {
      router.replace('/home');
    }
  }, [configured, ready, session]);

  // Keep a blank dark frame while we restore a saved session so sign-in never flashes.
  if (!ready || (configured && session)) {
    return (
      <View style={[styles.screen, styles.boot, { backgroundColor: '#000000' }]}>
        <StatusBar style="light" />
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.frame}>
        <View style={styles.stage}>
          <WelcomeMarks scale={1} />
          <View style={styles.lockup}>
            <Text style={[styles.title, { color: colors.text }]}>Nexus</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Your team of always-on agents{'\n'}that finish the work.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={() => router.push('/sign-in')}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.button, opacity: pressed ? 0.86 : 1 },
          ]}>
          <Text style={[styles.buttonLabel, { color: colors.buttonText }]}>Sign in</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  boot: {
    justifyContent: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: Space[6],
    paddingBottom: Space[3],
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
  },
  lockup: {
    alignItems: 'center',
    paddingHorizontal: Space[4],
    gap: Space[3],
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    ...Type.body,
    fontWeight: '400',
    textAlign: 'center',
  },
  button: {
    minHeight: 56,
    borderRadius: Radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space[6],
    shadowColor: '#111318',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonLabel: {
    ...Type.body,
    fontWeight: '600',
  },
});
