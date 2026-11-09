import { getSupabase } from '@/lib/supabase';

export type AccountDetails = {
  name: string;
  email: string;
  workspace: string;
  plan: string;
  status: string;
  renews: string;
  messagesUsed: number;
  whatsapp: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function line(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function titleCase(value: string) {
  if (!value) return '';
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function renewsOn(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function loadAccount(userId: string, email: string): Promise<AccountDetails> {
  const supabase = getSupabase();
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase
      .from('business_members')
      .select(
        'businesses(name, subscription_plan, subscription_status, subscription_current_period_end, subscription_messages_used, whatsapp_linked_phone, whatsapp_status)',
      )
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ]);

  const business = record(Array.isArray(membership?.businesses) ? membership.businesses[0] : membership?.businesses);
  const phone = line(business.whatsapp_linked_phone);
  const linked = line(business.whatsapp_status) === 'connected' || Boolean(phone);
  const renews = renewsOn(business.subscription_current_period_end);

  return {
    name: line((profile as { full_name?: string } | null)?.full_name) || 'Account',
    email,
    workspace: line(business.name) || 'Workspace',
    plan: titleCase(line(business.subscription_plan) || 'starter'),
    status: titleCase(line(business.subscription_status) || 'incomplete'),
    renews,
    messagesUsed: typeof business.subscription_messages_used === 'number' ? business.subscription_messages_used : 0,
    whatsapp: linked ? phone || 'Linked' : 'Not linked',
  };
}
