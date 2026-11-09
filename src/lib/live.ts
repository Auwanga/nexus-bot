import { getSupabase } from '@/lib/supabase';

type Change = { event: '*'; schema: 'public'; table: string; filter?: string };

/** Staff chats and the home list update when the website writes a message. */
export function watchThreads(sessionIds: string[], onChange: () => void) {
  const ids = [...new Set(sessionIds.filter(Boolean))];
  if (ids.length === 0) return () => undefined;
  const channel = getSupabase().channel(`threads:${ids.join(':')}`);
  for (const id of ids) {
    channel.on('postgres_changes', messageChange(id), () => onChange());
    channel.on('postgres_changes', sessionChange(id), () => onChange());
  }
  channel.subscribe();
  return () => {
    void getSupabase().removeChannel(channel);
  };
}

export function watchHome(businessId: string, onChange: () => void) {
  const channel = getSupabase()
    .channel(`home:${businessId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'nexus_staff_sessions', filter: `business_id=eq.${businessId}` },
      () => onChange(),
    )
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nexus_staff_messages' }, () => onChange())
    .subscribe();
  return () => {
    void getSupabase().removeChannel(channel);
  };
}

function messageChange(sessionId: string): Change {
  return { event: '*', schema: 'public', table: 'nexus_staff_messages', filter: `session_id=eq.${sessionId}` };
}

function sessionChange(sessionId: string): Change {
  return { event: 'UPDATE', schema: 'public', table: 'nexus_staff_sessions', filter: `id=eq.${sessionId}` };
}
