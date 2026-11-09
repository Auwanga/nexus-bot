import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';

import { FormattedText } from '@/components/formatted-text';
import { TopFade } from '@/components/edge-fade';
import { Radius, Space, Type } from '@/constants/theme';
import { useThemed, type Palette } from '@/lib/appearance';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function FollowupChips({
  items,
  busy,
  onFollowup,
}: {
  items: unknown[];
  busy?: boolean;
  onFollowup: (label: string) => void;
}) {
  const { styles } = useThemed(makeStyles);
  const chips = items.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [item.trim()];
    const row = record(item);
    const label = text(row.label);
    return label ? [label] : [];
  });
  if (chips.length === 0) return null;
  return (
    <View style={styles.chipRow}>
      {chips.map((label) => (
        <Pressable
          key={label}
          disabled={busy}
          onPress={() => onFollowup(label)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed, busy && styles.disabled]}>
          <Text style={styles.chipLabel} numberOfLines={2}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function WidgetCard({
  kicker,
  title,
  state,
  children,
  actions,
  accessibilityLabel,
}: {
  kicker?: string;
  title: string;
  state?: string;
  children?: ReactNode;
  actions?: ReactNode;
  accessibilityLabel?: string;
}) {
  const { styles } = useThemed(makeStyles);
  const { width } = useWindowDimensions();
  const compact = width < 380;
  return (
    <View
      accessibilityLabel={accessibilityLabel || title}
      style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitles}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {state ? (
          <View style={styles.statePill}>
            <Text style={styles.stateLabel} numberOfLines={1}>
              {state}
            </Text>
          </View>
        ) : null}
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
      {actions ? <View style={styles.actionRow}>{actions}</View> : null}
    </View>
  );
}

export function WidgetAction({
  label,
  primary,
  disabled,
  onPress,
}: {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { styles } = useThemed(makeStyles);
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.actionLabel, primary && styles.actionPrimaryLabel]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FactLine({ label, value }: { label?: string; value: string }) {
  const { styles } = useThemed(makeStyles);
  if (!value) return null;
  return (
    <Text style={styles.fact}>
      {label ? <Text style={styles.factLabel}>{label}. </Text> : null}
      {value}
    </Text>
  );
}

export function PageWidget({
  title,
  preview,
  markdown,
  followups,
  busy,
  onFollowup,
}: {
  title: string;
  preview?: string;
  markdown: string;
  followups?: unknown[];
  busy?: boolean;
  onFollowup: (label: string) => void;
}) {
  const { ink, styles } = useThemed(makeStyles);
  const [open, setOpen] = useState(false);
  const shortTitle = title.length > 80 ? `${title.slice(0, 77)}…` : title;

  return (
    <View style={styles.pageBlock}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${title}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.pageChip, pressed && styles.pressed]}>
        <View style={styles.pageWell} accessibilityElementsHidden>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Rect x="3" y="13" width="4" height="7" rx="1" fill="#34A853" />
            <Rect x="10" y="8" width="4" height="12" rx="1" fill="#FBBC04" />
            <Rect x="17" y="4" width="4" height="16" rx="1" fill="#4285F4" />
          </Svg>
        </View>
        <View style={styles.pageCopy}>
          <Text style={styles.pageName} numberOfLines={2}>
            {shortTitle}
          </Text>
          <Text style={styles.pageMeta}>{preview?.trim() || 'Page'}</Text>
        </View>
      </Pressable>
      <FollowupChips items={followups ?? []} busy={busy} onFollowup={onFollowup} />
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.reader}>
          <ScrollView contentContainerStyle={styles.readerList}>
            <Text style={styles.readerTitle}>{title}</Text>
            <FormattedText text={markdown} />
          </ScrollView>
          <TopFade color={ink.bg} solid={72} fade={28} />
          <SafeAreaView edges={['top']} style={styles.readerHeader} pointerEvents="box-none">
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => setOpen(false)} style={styles.readerBack}>
              <Text style={styles.readerChevron}>‹</Text>
            </Pressable>
            <Text style={styles.readerHeaderTitle} numberOfLines={1}>
              {shortTitle}
            </Text>
            <View style={styles.readerBackSpacer} />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

export function DataWidget({
  card,
  busy,
  onFollowup,
  onAction,
}: {
  card: Record<string, unknown>;
  busy: boolean;
  onFollowup: (text: string) => void;
  onAction: (
    decision:
      | { id: string; decision: 'approve' | 'reject' | 'retry'; body?: string }
      | { id: string; decision: 'pick'; address: string },
  ) => void;
}) {
  const { styles } = useThemed(makeStyles);
  const kind = text(card.kind);

  if (kind === 'profile') {
    const profile = record(card.profile);
    const rows: [string, string][] = [
      ['What you offer', profile.offer],
      ['Customers', profile.audience],
      ['Where', profile.location],
      ['Currency', profile.currency],
      ['Website', profile.website],
      ['Tone', profile.tone],
      ['Languages', profile.languages],
    ].flatMap(([label, value]) => (text(value) ? [[String(label), text(value)] as [string, string]] : []));
    return (
      <WidgetCard kicker="Business profile" title={text(card.businessName) || 'Business'}>
        {text(profile.summary) ? <FactLine value={text(profile.summary)} /> : null}
        {rows.map(([label, value]) => (
          <FactLine key={label} label={label} value={value} />
        ))}
      </WidgetCard>
    );
  }

  if (kind === 'menu' && Array.isArray(card.items)) {
    return (
      <WidgetCard kicker="Catalogue" title="Menu">
        {card.items.map((item) => {
          const row = record(item);
          const name = text(row.name);
          return (
            <View key={text(row.id) || name} style={styles.itemBlock}>
              <Text style={styles.itemTitle}>{name}</Text>
              <Text style={styles.fact}>
                {[text(row.unit), String(row.price ?? ''), text(row.stockNote)].filter(Boolean).join(' · ')}
              </Text>
              <FollowupChips
                items={[`Add ${name} to an order`, `Edit ${name}`]}
                busy={busy}
                onFollowup={onFollowup}
              />
            </View>
          );
        })}
      </WidgetCard>
    );
  }

  if (kind === 'invoice') {
    const lines = Array.isArray(card.lines) ? card.lines : [];
    return (
      <WidgetCard
        kicker="Invoice"
        title={text(card.contactName) || text(card.number) || 'Invoice'}
        state={text(card.status) || undefined}>
        <FactLine
          value={[text(card.number) ? `#${text(card.number)}` : '', `${text(card.currency)} ${String(card.total ?? '')}`]
            .filter(Boolean)
            .join(' · ')}
        />
        {lines.map((item) => {
          const line = record(item);
          return (
            <FactLine
              key={text(line.name)}
              value={`${text(line.name)} × ${String(line.qty ?? '')} = ${String(line.amount ?? '')}`}
            />
          );
        })}
        <View style={styles.actionRow}>
          <WidgetAction label="Edit" disabled={busy} onPress={() => onFollowup(`Edit invoice ${text(card.invoiceId)}`)} />
          {text(card.status) === 'draft' ? (
            <WidgetAction
              label="Issue"
              primary
              disabled={busy}
              onPress={() => onFollowup(`Issue invoice ${text(card.invoiceId)}`)}
            />
          ) : null}
          {text(card.status) === 'issued' ? (
            <WidgetAction label="Mark paid" disabled={busy} onPress={() => onFollowup(`Mark invoice ${text(card.invoiceId)} paid`)} />
          ) : null}
        </View>
      </WidgetCard>
    );
  }

  if (kind === 'contact') {
    return (
      <WidgetCard kicker="Contact" title={text(card.name) || 'Contact'}>
        <FactLine value={[text(card.phone), text(card.email), text(card.location)].filter(Boolean).join(' · ')} />
        <FollowupChips
          items={[`Draft a message to ${text(card.name)}`, `Follow up with ${text(card.name)}`]}
          busy={busy}
          onFollowup={onFollowup}
        />
      </WidgetCard>
    );
  }

  if (kind === 'deal') {
    return (
      <WidgetCard kicker="Deal" title={text(card.title) || 'Deal'} state={text(card.stage) || undefined}>
        <FactLine value={`${text(card.currency)} ${String(card.value ?? '')} · ${text(card.contactName)}`} />
        <FollowupChips
          items={[`Move deal ${text(card.dealId) || text(card.title)}`, `Follow up on ${text(card.title)}`]}
          busy={busy}
          onFollowup={onFollowup}
        />
      </WidgetCard>
    );
  }

  if (kind === 'delegation' && Array.isArray(card.items)) {
    return (
      <WidgetCard kicker="Team" title="Delegation">
        {card.items.map((item) => {
          const row = record(item);
          const report = text(row.report) || text(row.task);
          return (
            <Pressable key={text(row.agent)} onPress={() => onFollowup(report)} style={styles.itemBlock}>
              <FactLine label={text(row.agent)} value={report} />
            </Pressable>
          );
        })}
      </WidgetCard>
    );
  }

  if (kind === 'send_action') {
    const target = record(card.target);
    const state = text(card.state);
    const actionId = text(card.actionId);
    const candidates = Array.isArray(card.candidates) ? card.candidates : [];
    return (
      <WidgetCard kicker="WhatsApp" title={text(target.displayName) || text(target.address) || 'Send'} state={state || 'ready'}>
        {text(card.body) ? <Text style={styles.messageBody}>{text(card.body)}</Text> : null}
        {text(card.reason) ? <FactLine value={text(card.reason)} /> : null}
        {state === 'picking'
          ? candidates.map((item) => {
              const candidate = record(item);
              const address = text(candidate.address);
              if (!address || !actionId) return null;
              return (
                <WidgetAction
                  key={address}
                  label={text(candidate.name) || address}
                  disabled={busy}
                  onPress={() => onAction({ id: actionId, decision: 'pick', address })}
                />
              );
            })
          : null}
        {state === 'proposed' && actionId ? (
          <>
            <WidgetAction label="Reject" disabled={busy} onPress={() => onAction({ id: actionId, decision: 'reject' })} />
            <WidgetAction
              label="Approve"
              primary
              disabled={busy || !text(card.body)}
              onPress={() => onAction({ id: actionId, decision: 'approve' })}
            />
          </>
        ) : null}
        {state === 'failed' && actionId ? (
          <>
            <WidgetAction label="Retry" disabled={busy} onPress={() => onAction({ id: actionId, decision: 'retry' })} />
            <WidgetAction label="Change recipient" disabled={busy} onPress={() => onFollowup('Change recipient')} />
            <WidgetAction label="Cancel" disabled={busy} onPress={() => onAction({ id: actionId, decision: 'reject' })} />
          </>
        ) : null}
        {(state === 'picking' || state === 'needs_input') && actionId ? (
          <WidgetAction label="Cancel" disabled={busy} onPress={() => onAction({ id: actionId, decision: 'reject' })} />
        ) : null}
      </WidgetCard>
    );
  }

  if (kind === 'capability_gap') {
    return (
      <WidgetCard kicker="Capability" title={text(card.missing) || 'Missing capability'}>
        <FactLine value={text(card.proposal)} />
      </WidgetCard>
    );
  }

  if (kind === 'connectors') {
    return (
      <WidgetCard kicker="Apps" title="Connect apps">
        <FactLine value={`Apps for ${text(card.agentTitle) || 'this agent'} connect from the console.`} />
      </WidgetCard>
    );
  }

  if (kind === 'memory_receipt') {
    const counts = record(card.counts);
    const facts = Array.isArray(card.facts) ? card.facts.filter((line): line is string => typeof line === 'string') : [];
    return (
      <WidgetCard kicker="Memory" title="Memory receipt" state={`${String(counts.facts ?? facts.length)} facts`}>
        {facts.slice(0, 3).map((fact) => (
          <FactLine key={fact} value={fact} />
        ))}
        <FactLine value={`${String(counts.chunks ?? 0)} notes`} />
      </WidgetCard>
    );
  }

  if (kind === 'message_draft') {
    return (
      <WidgetCard kicker="Draft" title={`Message to ${text(card.to) || 'them'}`}>
        <Text style={styles.messageBody}>{text(card.body)}</Text>
        <FactLine value="Not sent." />
      </WidgetCard>
    );
  }

  if (kind === 'crm_picker') {
    return (
      <WidgetCard kicker="Agents" title="Choose an agent">
        <FactLine value="Ecommerce, sales, support, and bookings." />
      </WidgetCard>
    );
  }

  return null;
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
    card: {
      alignSelf: 'stretch',
      width: '100%',
      maxWidth: '100%',
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: ink.border,
      padding: Space[3],
      gap: Space[2],
      backgroundColor: ink.surfaceRaised,
    },
    cardCompact: { padding: Space[3] },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Space[2],
    },
    cardTitles: { flex: 1, minWidth: 0, gap: 2 },
    kicker: {
      ...Type.caption,
      color: ink.textMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    title: { ...Type.body, color: ink.text, fontWeight: '600' },
    statePill: {
      maxWidth: '42%',
      borderRadius: Radius.chip,
      paddingHorizontal: Space[2],
      paddingVertical: 4,
      backgroundColor: ink.backgroundSelected,
    },
    stateLabel: { ...Type.caption, color: ink.textMuted, fontWeight: '700' },
    body: { gap: Space[2], maxWidth: '100%' },
    fact: { ...Type.meta, color: ink.text, flexShrink: 1 },
    factLabel: { color: ink.textMuted, fontWeight: '600' },
    messageBody: { ...Type.chat, color: ink.text },
    itemBlock: { gap: Space[1], maxWidth: '100%' },
    itemTitle: { ...Type.meta, color: ink.text, fontWeight: '700' },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Space[2],
      maxWidth: '100%',
    },
    action: {
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: ink.border,
      paddingHorizontal: Space[3],
      paddingVertical: Space[2],
      backgroundColor: ink.surface,
      maxWidth: '100%',
    },
    actionPrimary: { backgroundColor: ink.button, borderColor: ink.button },
    actionLabel: { ...Type.meta, color: ink.text, fontWeight: '600' },
    actionPrimaryLabel: { color: ink.buttonText },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Space[2],
      maxWidth: '100%',
    },
    chip: {
      maxWidth: '100%',
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: ink.border,
      backgroundColor: ink.surfaceRaised,
      paddingHorizontal: Space[3],
      paddingVertical: Space[2],
    },
    chipLabel: { ...Type.meta, color: ink.text, fontWeight: '600' },
    pageBlock: { alignSelf: 'stretch', width: '100%', gap: Space[2] },
    pageChip: {
      alignSelf: 'stretch',
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space[3],
      borderRadius: 18,
      borderWidth: 1,
      borderColor: ink.border,
      backgroundColor: ink.surfaceRaised,
      paddingVertical: Space[2],
      paddingLeft: Space[2],
      paddingRight: Space[3],
    },
    pageWell: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: ink.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageCopy: { flex: 1, minWidth: 0, gap: 1 },
    pageName: { ...Type.meta, color: ink.text, fontWeight: '600' },
    pageMeta: { ...Type.caption, color: ink.textMuted },
    reader: { flex: 1, backgroundColor: ink.bg },
    readerList: {
      paddingHorizontal: Space[4],
      paddingTop: 108,
      paddingBottom: Space[8],
      gap: Space[4],
    },
    readerTitle: { ...Type.h1, color: ink.text },
    readerHeader: {
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
    readerBack: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: ink.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readerBackSpacer: { width: 44, height: 44 },
    readerChevron: { color: ink.text, fontSize: 28, lineHeight: 30, marginTop: -2 },
    readerHeaderTitle: { ...Type.agentName, color: ink.text, flex: 1, textAlign: 'center' },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.5 },
  });
}
