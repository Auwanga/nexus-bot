import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

import { getSupabase } from '@/lib/supabase';

export type ConnectorCategory = 'Communication' | 'Productivity' | 'Payments' | 'Design' | 'Stores';

export type ConnectorApp = {
  id: string;
  title: string;
  blurb: string;
  available: boolean;
  via: 'native' | 'composio';
  category: ConnectorCategory;
  recommended: boolean;
};

export const CONNECTOR_CATEGORIES = [
  'All',
  'Communication',
  'Productivity',
  'Payments',
  'Design',
  'Stores',
] as const;

/** Same catalogue the Kinetic console offers. */
export const CONNECTORS: readonly ConnectorApp[] = [
  {
    id: 'whatsapp',
    title: 'Kinetic WhatsApp',
    blurb: 'Reply to customers from your linked number.',
    available: true,
    via: 'native',
    category: 'Communication',
    recommended: true,
  },
  {
    id: 'gmail',
    title: 'Gmail',
    blurb: 'Read and send order, supplier and invoice emails.',
    available: true,
    via: 'composio',
    category: 'Communication',
    recommended: true,
  },
  {
    id: 'instagram',
    title: 'Instagram',
    blurb: 'Post products and promotions to your business profile.',
    available: true,
    via: 'composio',
    category: 'Communication',
    recommended: false,
  },
  {
    id: 'facebook',
    title: 'Facebook',
    blurb: 'Post to your Facebook Page.',
    available: true,
    via: 'composio',
    category: 'Communication',
    recommended: false,
  },
  {
    id: 'googlesheets',
    title: 'Google Sheets',
    blurb: 'Read stock lists and price lists, log orders.',
    available: true,
    via: 'composio',
    category: 'Productivity',
    recommended: true,
  },
  {
    id: 'googledrive',
    title: 'Google Drive',
    blurb: 'Find product photos, catalogues and documents.',
    available: true,
    via: 'composio',
    category: 'Productivity',
    recommended: true,
  },
  {
    id: 'googlecalendar',
    title: 'Google Calendar',
    blurb: 'Put agreed times on the calendar.',
    available: true,
    via: 'composio',
    category: 'Productivity',
    recommended: true,
  },
  {
    id: 'stripe',
    title: 'Stripe',
    blurb: 'Check payments, refunds and customers.',
    available: true,
    via: 'composio',
    category: 'Payments',
    recommended: true,
  },
  {
    id: 'paystack',
    title: 'Paystack',
    blurb: 'Check transactions and customers.',
    available: true,
    via: 'composio',
    category: 'Payments',
    recommended: false,
  },
  {
    id: 'flutterwave',
    title: 'Flutterwave',
    blurb: 'Check transactions and payment links.',
    available: true,
    via: 'composio',
    category: 'Payments',
    recommended: false,
  },
  {
    id: 'canva',
    title: 'Canva',
    blurb: 'Find and export designs for flyers and posts.',
    available: true,
    via: 'composio',
    category: 'Design',
    recommended: true,
  },
  {
    id: 'shopify',
    title: 'Shopify',
    blurb: 'Sync your Shopify catalogue and orders.',
    available: false,
    via: 'composio',
    category: 'Stores',
    recommended: false,
  },
  {
    id: 'wix',
    title: 'Wix',
    blurb: 'Sync your Wix store.',
    available: false,
    via: 'composio',
    category: 'Stores',
    recommended: false,
  },
];

export type ConnectorState = {
  businessId: string | null;
  enabled: boolean;
  connected: string[];
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

async function gateway<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, key } = gatewayConfig();
  if (!url) throw new Error('The Nexus gateway is not configured on this app.');
  const { data } = await getSupabase().auth.getSession();
  const headers: Record<string, string> = {};
  if (init?.body) headers['Content-Type'] = 'application/json';
  if (key) headers['X-Gateway-Key'] = key;
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  const response = await fetch(`${url}${path}`, { ...init, headers });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const detail = record(body).error;
    throw new Error(typeof detail === 'string' && detail ? detail : 'Could not reach connected apps.');
  }
  return body as T;
}

export async function loadConnectorState(userId: string): Promise<ConnectorState> {
  const supabase = getSupabase();
  const { data: memberships, error } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', userId)
    .limit(1);
  if (error) throw new Error(error.message);
  const businessId = (memberships?.[0] as { business_id?: string } | undefined)?.business_id ?? null;
  if (!businessId) return { businessId: null, enabled: false, connected: [] };

  const connected = new Set<string>();
  const { data: business } = await supabase
    .from('businesses')
    .select('whatsapp_status')
    .eq('id', businessId)
    .maybeSingle();
  if ((business as { whatsapp_status?: string } | null)?.whatsapp_status === 'connected') {
    connected.add('whatsapp');
  }

  const { data: sessions } = await supabase
    .from('nexus_staff_sessions')
    .select('metadata')
    .eq('business_id', businessId)
    .is('deleted_at', null);
  for (const session of sessions ?? []) {
    const whatsapp = record(record((session as { metadata?: unknown }).metadata).connectors).whatsapp;
    if (record(whatsapp).bound === true) connected.add('whatsapp');
  }

  let enabled = false;
  try {
    const result = await gateway<{ enabled?: boolean; apps?: { toolkit?: string; connected?: boolean }[] }>(
      `/ai/agents/apps?businessId=${encodeURIComponent(businessId)}`,
    );
    enabled = Boolean(result.enabled);
    for (const app of result.apps ?? []) {
      if (app.connected && typeof app.toolkit === 'string') connected.add(app.toolkit);
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '';
    if (!/not configured|gateway/i.test(message)) throw cause;
  }

  return { businessId, enabled, connected: [...connected] };
}

export async function startConnector(businessId: string, toolkit: string) {
  const result = await gateway<{ redirectUrl?: string }>('/ai/agents/apps/connect', {
    method: 'POST',
    body: JSON.stringify({ businessId, toolkit }),
  });
  if (!result.redirectUrl) throw new Error('Nexus did not return a sign-in link.');
  await WebBrowser.openBrowserAsync(result.redirectUrl);
}
