import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { Colors } from '@/constants/theme';

export type Scheme = 'light' | 'dark';
export type Palette = (typeof Colors)[Scheme];

const STORAGE_KEY = 'nexus.appearance';

type Appearance = {
  scheme: Scheme;
  ink: Palette;
  setScheme: (scheme: Scheme) => void;
};

const AppearanceContext = createContext<Appearance>({
  scheme: 'dark',
  ink: Colors.dark,
  setScheme: () => undefined,
});

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [scheme, setSchemeState] = useState<Scheme>('dark');

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setSchemeState(stored);
    });
  }, []);

  const setScheme = useCallback((next: Scheme) => {
    setSchemeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<Appearance>(
    () => ({ scheme, ink: Colors[scheme], setScheme }),
    [scheme, setScheme],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  return useContext(AppearanceContext);
}

export function useThemed<T>(factory: (ink: Palette) => T) {
  const appearance = useAppearance();
  const styles = useMemo(() => factory(appearance.ink), [appearance.ink, factory]);
  return { ...appearance, styles };
}

export function fadeColor(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((part) => part + part).join('') : raw;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}
