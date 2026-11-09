import { plainPreview } from '@/lib/markdown';
import { getSupabase } from '@/lib/supabase';

export type HomeAgent = {
  id: string;
  name: string;
  preview: string;
  when: string;
  color: string;
};

export type HomeTeam = {
  businessId: string | null;
  businessName: string;
  featured: HomeAgent | null;
  others: HomeAgent[];
};

const NEXUS_COLOR = '#3ecf8e';
/** Same four tones the website uses for agent blobs. One colour per agent. */
const AGENT_TONES = ['#7c6cf0', '#2fbfa0', '#f08a24', '#3ecf8e'] as const;

const NEXUS: HomeAgent = {
  id: 'nexus',
  name: 'Nexus',
  preview: 'Top agent',
  when: 'Today',
  color: NEXUS_COLOR,
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toneFor(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 33 + id.charCodeAt(index)) >>> 0;
  return AGENT_TONES[hash % AGENT_TONES.length] ?? AGENT_TONES[0];
}

function agentName(title: string | null, metadata: unknown) {
  const meta = record(metadata);
  const profileName = record(meta.profile).name;
  if (typeof profileName === 'string' && profileName.trim() && profileName.trim().toLowerCase() !== 'new chat') {
    return profileName.trim();
  }
  if (meta.role === 'master') return 'Nexus';
  if (meta.role === 'agent') {
    const named = title?.trim();
    return named && named.toLowerCase() !== 'new chat' ? named : 'Agent';
  }
  return 'Nexus';
}

function visibleOnWeb(message: MessageRow) {
  if (message.role === 'tool') return false;
  return record(message.metadata).decision == null;
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(date)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type Membership = { business_id: string; businesses: { name: string } | { name: string }[] | null };
type SessionRow = {
  id: string;
  title: string | null;
  metadata: unknown;
  updated_at: string;
};
type MessageRow = { session_id: string; role: string; content: string; created_at: string; metadata: unknown };

export async function loadHomeTeam(userId: string): Promise<HomeTeam> {
  const supabase = getSupabase();
  const { data: memberships, error: memberError } = await supabase
    .from('business_members')
    .select('business_id, businesses(name)')
    .eq('user_id', userId);
  if (memberError) throw new Error(memberError.message);

  const rows = (memberships ?? []) as Membership[];
  const businessIds = rows.map((row) => row.business_id);
  const firstBusiness = rows[0]?.businesses;
  let businessName = Array.isArray(firstBusiness)
    ? (firstBusiness[0]?.name ?? '')
    : (firstBusiness?.name ?? '');
  if (!businessName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();
    const fullName = (profile as { full_name?: string | null } | null)?.full_name?.trim();
    businessName = fullName || 'Workspace';
  }

  const sessionQuery = supabase
    .from('nexus_staff_sessions')
    .select('id, title, metadata, updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  const { data: sessions, error: sessionError } = businessIds.length
    ? await sessionQuery.or(`created_by.eq.${userId},business_id.in.(${businessIds.join(',')})`)
    : await sessionQuery.eq('created_by', userId);
  if (sessionError) throw new Error(sessionError.message);

  const sessionRows = (sessions ?? []) as SessionRow[];
  const ids = sessionRows.map((session) => session.id);
  const latest = new Map<string, MessageRow>();

  if (ids.length > 0) {
    const { data: messages, error: messageError } = await supabase
      .from('nexus_staff_messages')
      .select('session_id, role, content, created_at, metadata')
      .in('session_id', ids)
      .order('created_at', { ascending: false })
      .limit(Math.max(ids.length * 8, 40));
    if (messageError) throw new Error(messageError.message);
    for (const message of (messages ?? []) as MessageRow[]) {
      if (latest.has(message.session_id) || !visibleOnWeb(message)) continue;
      latest.set(message.session_id, message);
    }
  }

  const chats = sessionRows.map((session) => {
    const message = latest.get(session.id);
    const meta = record(session.metadata);
    const preview =
      (message?.content ? plainPreview(message.content) : '') ||
      (typeof meta.preview === 'string' ? meta.preview : '') ||
      'No messages yet';
    return {
      id: session.id,
      name: agentName(session.title, session.metadata),
      preview,
      when: formatWhen(message?.created_at ?? session.updated_at),
      color: meta.role === 'master' ? NEXUS_COLOR : toneFor(session.id),
      master: meta.role === 'master',
      agent: meta.role === 'agent',
    };
  });

  const master = chats.find((chat) => chat.master) ?? null;
  const desk = chats.find((chat) => !chat.master && !chat.agent) ?? null;
  const featuredSource = master ?? desk;
  const others = chats.filter((chat) => chat.agent);

  return {
    businessId: businessIds[0] ?? null,
    businessName,
    featured: featuredSource
      ? {
          id: featuredSource.id,
          name: featuredSource.name,
          preview: featuredSource.preview,
          when: featuredSource.when,
          color: NEXUS_COLOR,
        }
      : NEXUS,
    others: others.map(({ id, name, preview, when, color }) => ({ id, name, preview, when, color })),
  };
}
