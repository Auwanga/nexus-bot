import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export function useSession() {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!configured) return;

    const supabase = getSupabase();
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  return { session, ready, configured };
}

export async function signInWithKineticAccount(email: string, password: string) {
  try {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) return { error: error.message };
    if (!data.session) {
      return { error: 'This Kinetic account did not return a session. Confirm the email, then try again.' };
    }
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign in failed';
    if (/network request failed|failed to fetch|networkerror/i.test(message)) {
      return { error: 'Could not reach Kinetic. Check your connection and try again.' };
    }
    return { error: message };
  }
}

export async function signOut() {
  await getSupabase().auth.signOut();
}
