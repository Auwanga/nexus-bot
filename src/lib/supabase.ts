import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus, Platform } from 'react-native';

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function readSupabaseConfig() {
  const extra = (Constants.expoConfig?.extra ?? {}) as SupabaseExtra;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '';
  return { url, anonKey };
}

const { url, anonKey } = readSupabaseConfig();

export function isSupabaseConfigured() {
  return Boolean(url && anonKey);
}

let client: SupabaseClient | null = null;
let appStateBound = false;

function bindAppStateRefresh(supabase: SupabaseClient) {
  if (appStateBound || Platform.OS === 'web') return;
  appStateBound = true;

  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

export function getSupabase() {
  if (!url || !anonKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    bindAppStateRefresh(client);
  }

  return client;
}
