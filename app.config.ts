import type { ConfigContext, ExpoConfig } from 'expo/config';

const EAS_PROJECT_ID = '663c1396-2d32-4764-82d1-05f08b500060';

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    plugins: [...(config.plugins ?? []), 'expo-asset'],
    updates: {
      ...(typeof config.updates === 'object' && config.updates ? config.updates : {}),
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    extra: {
      ...(config.extra ?? {}),
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      gatewayUrl: process.env.EXPO_PUBLIC_GATEWAY_URL ?? '',
      gatewayKey: process.env.EXPO_PUBLIC_GATEWAY_KEY ?? '',
      eas: {
        ...((config.extra as { eas?: Record<string, unknown> } | undefined)?.eas ?? {}),
        projectId: EAS_PROJECT_ID,
      },
    },
  }) as ExpoConfig;
