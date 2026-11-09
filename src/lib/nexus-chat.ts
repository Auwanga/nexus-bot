import Constants from 'expo-constants';

import { getSupabase } from '@/lib/supabase';

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
  tools: string[];
  pending: { id: string; description: string; toolName?: string } | null;
  metadata: Record<string, unknown>;
};

export type ChatThread = {
  id: string;
  title: string;
  color: string | null;
  businessId: string;
  vertical: 'commerce' | 'care';
  sessionIds: string[];
  activity: string | null;
  messages: ChatMessage[];
};

type Extra = { gatewayUrl?: string; gatewayKey?: string };

function gatewayConfig() {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  const url = (process.env.EXPO_PUBLIC_GATEWAY_URL || extra.gatewayUrl || '').replace(/\/$/, '');
  const key = process.env.EXPO_PUBLIC_GATEWAY_KEY || extra.gatewayKey || '';
  return { url, key };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function loadChat(sessionId: string): Promise<ChatThread> {
  const supabase = getSupabase();
  const { data: session, error } = await supabase
    .from('nexus_staff_sessions')
    .select('id, title, metadata, business_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!session) throw new Error('This agent chat is not on the account.');

  const meta = record(session.metadata);
  const avatar = record(meta.avatar);
  const color = typeof avatar.color === 'string' ? avatar.color : null;
  const vertical = meta.vertical === 'care' ? 'care' : 'commerce';
  const agent = meta.role === 'agent';
  const profileName = record(meta.profile).name;
  const title = agent
    ? (session.title as string | null)?.trim() || 'Agent'
    : typeof profileName === 'string' && profileName.trim()
      ? profileName.trim()
      : 'Nexus';

  const sessionIds = agent ? [sessionId] : await nexusDeskIds(session.business_id as string, sessionId);
  const replyId = sessionIds[0] ?? sessionId;

  const { data: rows, error: messageError } = await supabase
    .from('nexus_staff_messages')
    .select('id, session_id, role, content, created_at, metadata')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true });
  if (messageError) throw new Error(messageError.message);

  const messages = ((rows ?? []) as {
    id: string;
    session_id: string;
    role: string;
    content: string;
    created_at: string;
    metadata: unknown;
  }[])
    .filter((row) => row.role !== 'tool' && record(row.metadata).decision == null)
    .map((row) => messageFromRow(row))
    .filter((row) => hasConsoleBody(row));

  return {
    id: replyId,
    title,
    color,
    businessId: session.business_id as string,
    vertical,
    sessionIds,
    activity: liveActivity(meta),
    messages,
  };
}

/** Console threads that belong to Nexus, newest first so a reply continues the latest one. */
async function nexusDeskIds(businessId: string, openedId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('nexus_staff_sessions')
    .select('id, metadata, updated_at')
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  const ids = ((data ?? []) as { id: string; metadata: unknown }[])
    .filter((row) => record(row.metadata).role !== 'agent')
    .map((row) => row.id);
  return ids.length > 0 ? ids : [openedId];
}

function messageFromRow(row: {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
  metadata: unknown;
}): ChatMessage {
  const meta = record(row.metadata);
  const tools = Array.isArray(meta.toolsExecuted)
    ? meta.toolsExecuted.flatMap((item) => {
        const tool = record(item);
        const name = typeof tool.name === 'string' ? tool.name : '';
        const summary = typeof tool.summary === 'string' ? tool.summary.trim() : '';
        if (!summary || internalNote(summary) || internalNote(name)) return [];
        if (name === 'app_find_tools' || name === 'app_connections' || name === 'app_run_tool' || name === 'search_contacts') return [];
        if (/^unknown tool:/i.test(summary) || /^found\s+[A-Z0-9_]/i.test(summary)) return [];
        return [summary];
      })
    : [];
  const pendingAction = record(meta.pendingAction);
  const pending =
    pendingAction.status === 'pending' && typeof pendingAction.id === 'string'
      ? {
          id: pendingAction.id,
          description:
            typeof pendingAction.description === 'string' ? pendingAction.description : 'Confirm this action',
          toolName: typeof pendingAction.toolName === 'string' ? pendingAction.toolName : undefined,
        }
      : null;
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: spoken(row.content),
    createdAt: row.created_at,
    tools,
    pending,
    metadata: meta,
  };
}

function hasConsoleBody(row: ChatMessage) {
  const meta = row.metadata;
  return Boolean(
    row.content ||
      row.tools.length > 0 ||
      row.pending ||
      meta.card ||
      meta.event ||
      meta.mailDraft ||
      meta.mailDrafts ||
      meta.setup ||
      meta.briefing ||
      meta.delegatedFrom ||
      meta.imageDataUrl ||
      meta.attachments ||
      meta.file,
  );
}

export type TeamLine = { id: string; name: string; body: string; mine: boolean };

/** The same two-agent transcript the web console opens from a team chip. */
export async function loadTeamThread(input: {
  viewerMessages: ChatMessage[];
  viewerName: string;
  peerSessionId: string | null;
  peerName: string;
}): Promise<TeamLine[]> {
  const viewerIds = new Set(input.viewerMessages.map((row) => row.sessionId));
  let peerRows: ChatMessage[] = [];
  if (input.peerSessionId && !viewerIds.has(input.peerSessionId)) {
    const { data, error } = await getSupabase()
      .from('nexus_staff_messages')
      .select('id, session_id, role, content, created_at, metadata')
      .eq('session_id', input.peerSessionId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    peerRows = ((data ?? []) as {
      id: string;
      session_id: string;
      role: string;
      content: string;
      created_at: string;
      metadata: unknown;
    }[])
      .filter((row) => row.role !== 'tool' && record(row.metadata).decision == null)
      .map((row) => messageFromRow(row));
  }
  const viewer = { ids: viewerIds, name: input.viewerName };
  const peer = { sessionId: input.peerSessionId, name: input.peerName };
  const lines = [...input.viewerMessages, ...peerRows].flatMap((row) => teamLine(row, viewer, peer));
  return dedupeTeamLines(lines).map((line) => ({
    id: line.id,
    name: line.name,
    body: line.body,
    mine: line.mine,
  }));
}

function teamLine(
  row: ChatMessage,
  viewer: { ids: Set<string>; name: string },
  peer: { sessionId: string | null; name: string },
): { id: string; at: string; body: string; author: string; name: string; mine: boolean }[] {
  const home = row.sessionId;
  const onViewer = viewer.ids.has(home);
  const onPeer = peer.sessionId != null && home === peer.sessionId;
  const event = record(row.metadata.event);
  const kind = event.kind === 'messaged' || event.kind === 'message_from' ? event.kind : null;
  const eventName = typeof event.agentName === 'string' ? event.agentName.trim() : '';
  const eventSession = typeof event.agentSessionId === 'string' ? event.agentSessionId : null;
  if (kind && eventName) {
    const body = row.content.replace(/\s+/g, ' ').trim();
    if (!body) return [];
    const namesPeer = sameName(eventName, peer.name) || (peer.sessionId != null && eventSession === peer.sessionId);
    const namesViewer = sameName(eventName, viewer.name) || (eventSession != null && viewer.ids.has(eventSession));
    if (kind === 'messaged' && onViewer && namesPeer) return [line(row, body, viewer.name, true)];
    if (kind === 'messaged' && onPeer && namesViewer) return [line(row, body, peer.name, false)];
    if (kind === 'message_from' && onViewer && namesPeer) return [line(row, body, peer.name, false)];
    if (kind === 'message_from' && onPeer && namesViewer) return [line(row, body, viewer.name, true)];
    return [];
  }
  if (row.role === 'user' && typeof row.metadata.delegatedFrom === 'string') {
    const body = row.content.replace(/^Task from [^:\n]+:\s*/, '').replace(/\s+/g, ' ').trim();
    if (!body) return [];
    const fromId = row.metadata.delegatedFrom;
    const fromName = typeof row.metadata.fromName === 'string' && row.metadata.fromName.trim() ? row.metadata.fromName.trim() : viewer.name;
    const fromPeer = fromId === peer.sessionId || sameName(fromName, peer.name);
    const fromViewer = viewer.ids.has(fromId) || sameName(fromName, viewer.name);
    if (onViewer && fromPeer) return [line(row, body, peer.name, false)];
    if (onPeer && fromViewer) return [line(row, body, viewer.name, true)];
  }
  return [];
}

function line(row: ChatMessage, body: string, name: string, mine: boolean) {
  return { id: row.id, at: row.createdAt, body, author: mine ? 'self' : name.toLowerCase(), name, mine };
}

function sameName(left: string, right: string) {
  return teammateKey(left) === teammateKey(right);
}

function teammateKey(name: string) {
  const clean = name.trim().toLowerCase();
  return clean === 'new chat' ? 'nexus' : clean;
}

function dedupeTeamLines<T extends { id: string; at: string; body: string; author: string }>(lines: T[]): T[] {
  const kept: T[] = [];
  for (const item of [...lines].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))) {
    const at = new Date(item.at).getTime();
    const mirror = kept.some((other) => {
      if (`${other.author}|${other.body}` !== `${item.author}|${item.body}`) return false;
      const then = new Date(other.at).getTime();
      return Number.isFinite(at) && Number.isFinite(then) && Math.abs(at - then) < 2 * 60 * 1000;
    });
    if (!mirror) kept.push(item);
  }
  return kept;
}

const INTERNAL_NOTE =
  /no conversation found|outside the .+ agent's tools|search_contacts|ask_top_agent|propose_capability|no top agent|need to call tools|do not invent a send|not in the tool catalogue|list_contacts or list_conversations/i;

function internalNote(value: string) {
  return INTERNAL_NOTE.test(value);
}

function liveActivity(meta: Record<string, unknown>) {
  const activity = record(meta.activity);
  const text = typeof activity.text === 'string' ? activity.text.trim() : '';
  const at = typeof activity.at === 'string' ? Date.parse(activity.at) : Number.NaN;
  if (!text || !Number.isFinite(at) || Date.now() - at > 2 * 60 * 1000) return null;
  return text;
}

function spoken(content: string) {
  const cleaned = content
    .replace(/```(?:json)?[\s\S]*?```/gi, '')
    .replace(/\{\s*"tools"\s*:\s*\[[\s\S]*?\]\s*\}/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned
    .split(/\n{2,}/)
    .map((block) => block.split('\n').filter((line) => !internalNote(line)).join('\n').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export type MailDraftDecision = {
  id: string;
  messageId?: string;
  decision: 'send' | 'discard';
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
};

export async function sendChatTurn(
  thread: ChatThread,
  message: string,
  userId: string,
  actionDecision?: { id: string; decision: 'approve' | 'reject' | 'retry' | 'pick'; body?: string; address?: string; reason?: string },
  mailDraft?: MailDraftDecision,
) {
  const { url, key } = gatewayConfig();
  if (!url) throw new Error('The Nexus gateway is not configured on this app.');
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['X-Gateway-Key'] = key;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${url}/ai/assistant/turn`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        businessId: thread.businessId,
        userId,
        message,
        sessionId: thread.id,
        vertical: thread.vertical,
        ...(actionDecision ? { actionDecision } : {}),
        ...(mailDraft ? { mailDraft } : {}),
      }),
    });
  } catch {
    throw new Error('Could not reach the Nexus gateway. Stay on the same Wi-Fi as this computer and try again.');
  }
  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) detail = json.error;
    } catch {
      /* plain text */
    }
    throw new Error(detail || 'Nexus could not answer.');
  }
}
