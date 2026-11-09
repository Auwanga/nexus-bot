import { getSupabase } from '@/lib/supabase';

export type LibraryFile = { id: string; name: string; createdAt: string };

export type AgentInfo = {
  id: string;
  name: string;
  kind: string;
  businessName: string;
  purpose: string;
  duties: string;
  topAgent: boolean;
  files: LibraryFile[];
};

const TOP_PURPOSE = 'Run the store with staff and lead the sub-agents';
const TOP_DUTIES = 'Answer staff questions, keep the catalogue and orders tidy, and hand work to the right sub-agent';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function line(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export async function loadAgentInfo(sessionId: string): Promise<AgentInfo> {
  const supabase = getSupabase();
  const { data: session, error } = await supabase
    .from('nexus_staff_sessions')
    .select('id, title, metadata, business_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!session) throw new Error('This agent is not on the account.');

  const meta = record(session.metadata);
  const profile = record(meta.profile);
  const agent = meta.role === 'agent';
  const template = meta.template === 'whatsapp' ? 'ecommerce' : meta.template;
  const title = line(session.title);
  const profileName = line(profile.name);
  const name = agent
    ? title && title.toLowerCase() !== 'new chat'
      ? title
      : 'Agent'
    : profileName && profileName.toLowerCase() !== 'new chat'
      ? profileName
      : 'Nexus';

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', session.business_id as string)
    .maybeSingle();

  let filesQuery = supabase
    .from('nexus_library_files')
    .select('id, name, created_at')
    .eq('business_id', session.business_id as string)
    .order('created_at', { ascending: false })
    .limit(80);
  filesQuery = agent ? filesQuery.eq('agent_session_id', sessionId) : filesQuery.is('agent_session_id', null);
  const { data: files, error: fileError } = await filesQuery;
  if (fileError) throw new Error(fileError.message);

  return {
    id: session.id as string,
    name,
    kind: agent ? (template === 'ecommerce' ? 'Ecommerce agent' : title || 'Agent') : 'Top agent',
    businessName: line((business as { name?: string } | null)?.name),
    purpose: agent ? line(meta.preview) : line(profile.purpose) || TOP_PURPOSE,
    duties: agent ? '' : line(profile.duties) || TOP_DUTIES,
    topAgent: !agent,
    files: ((files ?? []) as { id: string; name: string; created_at: string }[]).map((file) => ({
      id: file.id,
      name: file.name,
      createdAt: file.created_at,
    })),
  };
}

export async function saveTopAgentRole(sessionId: string, purpose: string, duties: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('nexus_staff_sessions')
    .select('metadata')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const meta = record(data?.metadata);
  const profile = record(meta.profile);
  const { error: updateError } = await supabase
    .from('nexus_staff_sessions')
    .update({
      metadata: {
        ...meta,
        profile: { ...profile, purpose: purpose.trim(), duties: duties.trim() },
      },
    })
    .eq('id', sessionId);
  if (updateError) throw new Error(updateError.message);
}
