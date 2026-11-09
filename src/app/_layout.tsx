import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppearanceProvider, useAppearance } from '@/lib/appearance';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: false, duration: 0 });

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <RootShell />
    </AppearanceProvider>
  );
}

function RootShell() {
  const { scheme, ink } = useAppearance();

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: ink.bg },
          }}
        />
        <AnimatedSplashOverlay />
      </ThemeProvider>
    </KeyboardProvider>
  );
}
