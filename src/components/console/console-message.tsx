import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bloub } from '@/components/bloub';
import { DataWidget, FactLine, PageWidget, WidgetAction, WidgetCard } from '@/components/console/ai-widgets';
import { TopFade } from '@/components/edge-fade';
import { WhatsAppMark } from '@/components/whatsapp-mark';
import { CollapsibleText } from '@/components/collapsible-text';
import { FormattedText } from '@/components/formatted-text';
import { Radius, Space, Type } from '@/constants/theme';
import { useThemed, type Palette } from '@/lib/appearance';
import { loadTeamThread, type ChatMessage, type MailDraftDecision, type TeamLine } from '@/lib/nexus-chat';

type ActionDecision =
  | { id: string; decision: 'approve' | 'reject' | 'retry'; body?: string }
  | { id: string; decision: 'pick'; address: string };

type Props = {
  message: ChatMessage;
  messages: ChatMessage[];
  viewerName: string;
  busy: boolean;
  accent: string;
  showSetup: boolean;
  onDecision: (decision: 'approve' | 'reject') => void;
  onAction: (decision: ActionDecision) => void;
  onMail: (draft: MailDraftDecision) => void;
  onFollowup: (text: string) => void;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function ConsoleMessage({
  message,
  messages,
  viewerName,
  busy,
  accent,
  showSetup,
  onDecision,
  onAction,
  onMail,
  onFollowup,
}: Props) {
  const { scheme, ink, styles } = useThemed(makeStyles);
  const meta = message.metadata;
  const event = readEvent(meta.event);
  const [peer, setPeer] = useState<{ name: string; sessionId: string | null } | null>(null);

  if (event || text(meta.delegatedFrom)) {
    const name = teammateName(event?.agentName || text(meta.fromName) || 'Agent');
    const sessionId = event?.agentSessionId || text(meta.delegatedFrom) || null;
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${event?.kind === 'message_from' ? 'Message from' : 'Messaged'} ${name}`}
          onPress={() => setPeer({ name, sessionId })}
          style={({ pressed }) => [styles.event, pressed && styles.pressed]}>
          <Text style={styles.eventLabel}>{event?.kind === 'message_from' ? 'Message from' : 'Messaged'}</Text>
          <Bloub size={18} color={accent} />
          <Text style={styles.eventName}>{name}</Text>
        </Pressable>
        <PeerSheet
          open={peer}
          messages={messages}
          viewerName={viewerName}
          viewerColor={accent}
          onClose={() => setPeer(null)}
        />
      </>
    );
  }

  const mine = message.role === 'user';
  const mails = mine ? [] : readMails(meta);
  const card = mine ? {} : record(meta.card);
  const setup = showSetup ? readSetup(meta.setup) : null;
  const briefing = mine ? {} : record(meta.briefing);
  const remembered = Array.isArray(meta.remembered) ? meta.remembered.filter((line): line is string => typeof line === 'string' && line.trim().length > 0) : [];
  const spoken = mails.length > 0 ? hideMailAsk(message.content) : message.content;
  const receipt = mine || card.kind ? null : readWhatsAppSend(spoken);
  const image = text(meta.imageDataUrl);
  const files = readFiles(meta);
  const onlyReceipt =
    Boolean(receipt) &&
    !message.pending &&
    mails.length === 0 &&
    !card.kind &&
    !image &&
    files.length === 0 &&
    !setup &&
    !text(briefing.title);

  if (onlyReceipt && receipt) return <WhatsAppReceipt phone={receipt} />;

  return (
    <View
      style={[
        styles.bubble,
        mine ? [styles.mine, { backgroundColor: accent }] : scheme === 'light' ? styles.theirsLight : styles.theirs,
        (card.kind || text(briefing.title)) && !mine ? styles.bubbleWithWidgets : null,
      ]}>
      {image ? <Image source={{ uri: image }} style={styles.image} accessibilityIgnoresInvertColors /> : null}
      {receipt ? <WhatsAppReceipt phone={receipt} /> : spoken ? (
        <CollapsibleText
          messageId={message.id}
          text={spoken}
          fade={mine ? accent : scheme === 'light' ? '#f2f2f0' : ink.surfaceRaised}
          labelColor={mine ? '#FFFFFF' : undefined}>
          {mine ? (
            <Text style={[styles.userText, { color: '#FFFFFF' }]}>{spoken}</Text>
          ) : (
            <FormattedText text={spoken} color={scheme === 'light' ? '#000000' : undefined} />
          )}
        </CollapsibleText>
      ) : null}
      {files.map((file) => (
        <View key={file} style={styles.file}>
          <Text style={styles.fileName}>{file}</Text>
          <Text style={styles.fileHint}>File</Text>
        </View>
      ))}
      {message.tools.map((tool) => (
        <Text key={tool} style={styles.tool}>
          {tool}
        </Text>
      ))}
      {mails.map((draft) => (
        <MailCard key={draft.id || draft.to} draft={draft} busy={busy} messageId={message.id} onMail={onMail} />
      ))}
      {message.pending ? (
        <WidgetCard kicker="Confirm" title={message.pending.description}>
          <View style={styles.actionRow}>
            <WidgetAction label="Reject" disabled={busy} onPress={() => onDecision('reject')} />
            <WidgetAction
              label={message.pending.toolName === 'add_catalogue_products' ? 'Add to catalogue' : 'Approve'}
              primary
              disabled={busy}
              onPress={() => onDecision('approve')}
            />
          </View>
        </WidgetCard>
      ) : null}
      {card.kind ? <DataWidget card={card} busy={busy} onFollowup={onFollowup} onAction={onAction} /> : null}
      {text(briefing.title) && text(briefing.markdown) ? (
        <PageWidget
          title={text(briefing.title)}
          preview={text(briefing.preview) || 'Page'}
          markdown={text(briefing.markdown)}
          followups={Array.isArray(briefing.followups) ? briefing.followups : []}
          busy={busy}
          onFollowup={onFollowup}
        />
      ) : null}
      {setup ? <SetupCard card={setup} /> : null}
      {remembered.length > 0 ? (
        <View style={styles.rememberedBlock}>
          <Text style={styles.rememberedLabel}>Remembered</Text>
          {remembered.map((line) => (
            <Text key={line} style={styles.remembered}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function hideMailAsk(value: string) {
  const cut = value.split(/⚠️?\s*\**\s*confirmation (?:needed|required)\**/i)[0] ?? value;
  const without = cut
    .replace(/please reply with confirm[\s\S]*/gi, '')
    .replace(/awaiting your confirmation\.?/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (/reply\s+\**confirm\**|you'd like me to send an email|you would like me to send an email/i.test(without)) return '';
  return without;
}

function readWhatsAppSend(value: string) {
  const flat = value
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[✅❌]\s*/, '')
    .replace(/\.?\s*check the chats inbox to verify delivery\.?$/i, '')
    .replace(/\.$/, '');
  const generic = flat.match(/^whatsapp sent to (\+?\d[\d\s-]{6,})$/i);
  if (generic) return generic[1].replace(/[\s-]/g, '');
  const named = flat.match(/^whatsapp sent to (.+?) \((\+?\d[\d\s-]{6,})\)/i);
  return named ? named[2].replace(/[\s-]/g, '') : null;
}

function readFiles(meta: Record<string, unknown>) {
  const source = Array.isArray(meta.attachments) ? meta.attachments : meta.file ? [meta.file] : [];
  return source.flatMap((item) => {
    const name = text(record(item).name);
    return name ? [name] : [];
  });
}

function WhatsAppReceipt({ phone }: { phone: string }) {
  const { styles } = useThemed(makeStyles);
  const shown = formatPhone(phone);
  return (
    <View style={styles.receipt} accessibilityLabel={`WhatsApp sent to ${shown}`}>
      <View style={styles.receiptMark}>
        <WhatsAppMark size={22} color="#FFFFFF" />
      </View>
      <View style={styles.receiptCopy}>
        <Text style={styles.receiptChannel}>WhatsApp</Text>
        <Text style={styles.receiptPhone} numberOfLines={1}>
          {shown}
        </Text>
      </View>
      <View style={styles.receiptState}>
        <Text style={styles.receiptCheck}>✓</Text>
        <Text style={styles.receiptStateLabel}>Sent</Text>
      </View>
    </View>
  );
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('264') && digits.length === 12) {
    const local = digits.slice(3);
    return `+264 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return digits.length >= 8 ? `+${digits}` : raw.trim();
}

function teammateName(name: string) {
  const clean = name.trim();
  return clean.toLowerCase() === 'new chat' ? 'Nexus' : clean || 'Nexus';
}

function readEvent(value: unknown) {
  const event = record(value);
  if (event.kind !== 'messaged' && event.kind !== 'message_from') return null;
  if (!text(event.agentName)) return null;
  return {
    kind: event.kind as 'messaged' | 'message_from',
    agentName: teammateName(text(event.agentName)),
    agentSessionId: text(event.agentSessionId) || null,
  };
}

type Mail = { id: string; status: string; from: string; to: string; cc: string; subject: string; body: string };

function readMails(meta: Record<string, unknown>): Mail[] {
  const source = Array.isArray(meta.mailDrafts) ? meta.mailDrafts : meta.mailDraft ? [meta.mailDraft] : [];
  return source.flatMap((item) => {
    const row = record(item);
    const to = text(row.to);
    const body = text(row.body);
    if (!to && !body) return [];
    return [
      {
        id: text(row.id) || text(record(meta.pendingAction).id),
        status: row.status === 'sent' || row.status === 'discarded' ? row.status : 'pending',
        from: text(row.from) || 'Connected Gmail',
        to,
        cc: text(row.cc),
        subject: text(row.subject) === '(no subject)' ? '' : text(row.subject),
        body,
      },
    ];
  });
}

function MailCard({
  draft,
  busy,
  messageId,
  onMail,
}: {
  draft: Mail;
  busy: boolean;
  messageId: string;
  onMail: (draft: MailDraftDecision) => void;
}) {
  const { ink, styles } = useThemed(makeStyles);
  const [to, setTo] = useState(draft.to);
  const [cc, setCc] = useState(draft.cc);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  if (draft.status !== 'pending') {
    return (
      <Text style={styles.tool}>
        {draft.status === 'sent' ? 'Sent email' : 'Discarded'} · {draft.to}
      </Text>
    );
  }
  return (
    <WidgetCard kicker="Email" title={subject || 'Draft email'}>
      <TextInput value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor={ink.textMuted} style={styles.field} />
      <FactLine label="From" value={draft.from} />
      <TextInput value={to} onChangeText={setTo} placeholder="To" placeholderTextColor={ink.textMuted} style={styles.field} autoCapitalize="none" />
      <TextInput value={cc} onChangeText={setCc} placeholder="Cc" placeholderTextColor={ink.textMuted} style={styles.field} autoCapitalize="none" />
      <TextInput value={body} onChangeText={setBody} multiline style={[styles.field, styles.body]} />
      <View style={styles.actionRow}>
        <WidgetAction label="Discard" disabled={busy} onPress={() => onMail({ id: draft.id, messageId, decision: 'discard' })} />
        <WidgetAction
          label="Send"
          primary
          disabled={busy}
          onPress={() => onMail({ id: draft.id, messageId, decision: 'send', to, cc, subject, body })}
        />
      </View>
    </WidgetCard>
  );
}

function readSetup(value: unknown) {
  const card = record(value);
  if (!Array.isArray(card.checklist)) return null;
  return {
    title: text(card.title) || 'Agent',
    status: text(card.status),
    checklist: card.checklist.flatMap((item) => {
      const row = record(item);
      if (!text(row.label)) return [];
      return [{ label: text(row.label), detail: text(row.detail), done: row.done === true }];
    }),
  };
}

function SetupCard({ card }: { card: NonNullable<ReturnType<typeof readSetup>> }) {
  const done = card.checklist.filter((item) => item.done).length;
  const open = card.checklist.filter((item) => !item.done);
  const shown = open.length > 0 ? open : card.checklist;
  return (
    <WidgetCard
      kicker="Setup"
      title={`${card.title} setup`}
      state={card.status === 'live' ? 'Live' : card.status === 'ready' ? 'Ready' : 'Setting up'}>
      <FactLine value={`${done} of ${card.checklist.length} done`} />
      {shown.map((item) => (
        <FactLine key={item.label} value={`${item.done ? '✓' : '○'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`} />
      ))}
    </WidgetCard>
  );
}

const PEER_TONES = ['#7c6cf0', '#2fbfa0', '#f08a24', '#3ecf8e'] as const;

function peerTone(id: string | null) {
  if (!id) return PEER_TONES[0];
  let hash = 0;
  for (const char of id) hash = (hash + char.charCodeAt(0)) % PEER_TONES.length;
  return PEER_TONES[hash] ?? PEER_TONES[0];
}

function PeerSheet({
  open,
  messages,
  viewerName,
  viewerColor,
  onClose,
}: {
  open: { name: string; sessionId: string | null } | null;
  messages: ChatMessage[];
  viewerName: string;
  viewerColor: string;
  onClose: () => void;
}) {
  const { ink, styles } = useThemed(makeStyles);
  const [lines, setLines] = useState<TeamLine[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function load(peer: { name: string; sessionId: string | null }) {
    setFailed(null);
    setLines([]);
    setLoading(true);
    void loadTeamThread({
      viewerMessages: messages,
      viewerName,
      peerSessionId: peer.sessionId,
      peerName: peer.name,
    })
      .then(setLines)
      .catch((error: unknown) => setFailed(error instanceof Error ? error.message : 'Could not open that thread'))
      .finally(() => setLoading(false));
  }

  const title = open ? `${viewerName} and ${open.name}` : 'Team thread';

  return (
    <Modal visible={Boolean(open)} animationType="slide" onShow={() => { if (open) load(open); }} onRequestClose={onClose}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.pageList}>
          {failed ? <Text style={styles.pageStatus}>{failed}</Text> : null}
          {loading ? <Text style={styles.pageStatus}>Opening the thread…</Text> : null}
          {!failed && !loading && lines.length === 0 ? (
            <Text style={styles.pageStatus}>No messages between {viewerName} and {open?.name} yet.</Text>
          ) : null}
          {lines.map((line) => (
            <View key={line.id} style={styles.pageLine}>
              <Text style={styles.pageSpeaker}>{line.mine ? viewerName : line.name}</Text>
              <FormattedText text={line.body} />
            </View>
          ))}
        </ScrollView>
        <TopFade color={ink.bg} solid={72} fade={28} />
        <SafeAreaView edges={['top']} style={styles.pageHeader} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose} style={styles.pageBack}>
            <Text style={styles.pageChevron}>‹</Text>
          </Pressable>
          <View accessibilityLabel={title} style={styles.pagePair}>
            <View style={styles.pageFace}>
              <Bloub size={34} color={viewerColor} />
            </View>
            <View style={[styles.pageFace, styles.pageFaceOverlap]}>
              <Bloub size={34} color={peerTone(open?.sessionId ?? open?.name ?? null)} />
            </View>
          </View>
        </SafeAreaView>
        <SafeAreaView edges={['bottom']} style={styles.pageFoot} pointerEvents="none">
          <View style={styles.readOnly}>
            <View style={styles.lock}>
              <View style={styles.lockShackle} />
              <View style={styles.lockBody} />
            </View>
            <Text style={styles.readOnlyLabel}>Read-only</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
  bubble: { maxWidth: '92%', borderRadius: 22, paddingHorizontal: Space[4], paddingVertical: Space[3], gap: Space[2] },
  theirs: { alignSelf: 'stretch', backgroundColor: ink.surfaceRaised },
  theirsLight: { alignSelf: 'stretch', backgroundColor: '#f2f2f0' },
  mine: { alignSelf: 'flex-end', backgroundColor: ink.backgroundSelected, maxWidth: '78%' },
  userText: { ...Type.chat, color: ink.text },
  tool: { ...Type.caption, color: ink.textMuted },
  event: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    paddingVertical: Space[1],
  },
  eventLabel: { ...Type.caption, color: ink.textMuted },
  eventName: { ...Type.agentName, color: ink.text },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: ink.border,
    padding: Space[3],
    gap: Space[2],
    backgroundColor: ink.surface,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space[2] },
  cardTitle: { ...Type.body, color: ink.text, fontWeight: '600', flexShrink: 1 },
  cardKicker: { ...Type.caption, color: ink.textMuted },
  fact: { ...Type.meta, color: ink.text },
  factLabel: { color: ink.textMuted },
  field: {
    ...Type.body,
    color: ink.text,
    borderBottomWidth: 1,
    borderBottomColor: ink.border,
    paddingVertical: Space[1],
  },
  body: { minHeight: 96, textAlignVertical: 'top' },
  actions: { gap: Space[2], marginTop: Space[1] },
  pending: { ...Type.meta, color: ink.text },
  actionRow: { flexDirection: 'row', gap: Space[2] },
  action: {
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: ink.border,
    paddingHorizontal: Space[4],
    paddingVertical: Space[2],
  },
  actionPrimary: { backgroundColor: ink.button, borderColor: ink.button },
  actionLabel: { ...Type.meta, color: ink.text },
  actionPrimaryLabel: { color: ink.buttonText },
  file: {
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: ink.border,
    paddingHorizontal: Space[3],
    paddingVertical: Space[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fileName: { ...Type.meta, color: ink.text, flex: 1 },
  fileHint: { ...Type.caption, color: ink.textMuted },
  image: { width: '100%', height: 180, borderRadius: Radius.card, backgroundColor: ink.bg },
  rememberedLabel: { ...Type.caption, color: ink.textMuted },
  remembered: { ...Type.caption, color: ink.textMuted },
  pressed: { opacity: 0.7 },
  receipt: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    paddingLeft: Space[2],
    paddingRight: Space[3],
    paddingVertical: Space[2],
    borderRadius: 18,
    backgroundColor: '#13241A',
    borderWidth: 1,
    borderColor: '#1E4D32',
  },
  receiptMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptCopy: { flexShrink: 1, gap: 1, paddingRight: Space[2] },
  receiptChannel: { ...Type.caption, color: '#8FBF9E', fontWeight: '600' },
  receiptPhone: { ...Type.body, color: ink.text, fontWeight: '600' },
  receiptState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: Space[2],
    paddingVertical: 4,
    borderRadius: Radius.chip,
    backgroundColor: '#1A3D28',
  },
  receiptCheck: { color: '#25D366', fontSize: 13, fontWeight: '700' },
  receiptStateLabel: { ...Type.caption, color: '#25D366', fontWeight: '700' },
  page: { flex: 1, backgroundColor: ink.bg },
  pageList: { paddingHorizontal: Space[4], paddingTop: 124, paddingBottom: 120, gap: Space[5] },
  pageStatus: { ...Type.body, color: ink.textMuted, textAlign: 'center', marginTop: Space[6] },
  pageLine: { gap: Space[1] },
  pageSpeaker: { ...Type.agentName, color: ink.textMuted },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    paddingHorizontal: Space[3],
    paddingBottom: Space[2],
  },
  pageBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ink.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageChevron: { color: ink.text, fontSize: 28, lineHeight: 30, marginTop: -2 },
  pagePair: { width: 56, height: 40, justifyContent: 'center' },
  pageFace: {
    position: 'absolute',
    left: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: ink.bg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.bg,
  },
  pageFaceOverlap: { left: 20, zIndex: 1 },
  pageFoot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: Space[2],
  },
  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    paddingHorizontal: Space[4],
    paddingVertical: Space[2],
    borderRadius: Radius.chip,
    backgroundColor: ink.surfaceRaised,
    borderWidth: 1,
    borderColor: ink.border,
  },
  readOnlyLabel: { ...Type.meta, color: ink.text, fontWeight: '600' },
  lock: { width: 12, height: 14, alignItems: 'center' },
  lockShackle: {
    width: 8,
    height: 6,
    borderWidth: 1.5,
    borderColor: ink.text,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  lockBody: { width: 12, height: 8, marginTop: -1, borderRadius: 2, backgroundColor: ink.text },
});
}
