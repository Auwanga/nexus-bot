import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bloub } from '@/components/bloub';
import { Bone } from '@/components/bone';
import { ChatComposer } from '@/components/chat-composer';
import { ConsoleMessage } from '@/components/console/console-message';
import { BottomFade, TopFade } from '@/components/edge-fade';
import { ThinkingLine } from '@/components/thinking-line';
import { Radius, Space, Type } from '@/constants/theme';
import { useThemed, type Palette } from '@/lib/appearance';
import { useSession } from '@/lib/auth';
import { watchThreads } from '@/lib/live';
import { loadChat, sendChatTurn, type ChatThread, type MailDraftDecision } from '@/lib/nexus-chat';

type ActionDecision =
  | { id: string; decision: 'approve' | 'reject' | 'retry'; body?: string }
  | { id: string; decision: 'pick'; address: string };

export default function ChatScreen() {
  const { scheme, ink, styles } = useThemed(makeStyles);
  const params = useLocalSearchParams<{ id: string; name?: string; color?: string }>();
  const sessionId = String(params.id ?? '');
  const fallbackName = String(params.name ?? 'Nexus');
  const fallbackColor = `#${String(params.color ?? '3ecf8e').replace('#', '')}`;
  const { session, ready, configured } = useSession();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardState((state) => state.height);
  const list = useRef<{ scrollToEnd: (options?: { animated?: boolean }) => void } | null>(null);
  const sending = useRef(false);
  const nearBottom = useRef(true);
  const stick = useRef(false);
  const [composerHeight, setComposerHeight] = useState(96);

  const pin = useCallback((animated = true) => {
    if (!nearBottom.current && !stick.current) return;
    list.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    if (keyboardHeight <= 0) return;
    requestAnimationFrame(() => pin());
  }, [keyboardHeight, pin]);

  const refresh = useCallback(async () => {
    const next = await loadChat(sessionId);
    setThread(next);
    setError(null);
    return next;
  }, [sessionId]);

  useEffect(() => {
    if (ready && configured && !session) router.replace('/sign-in');
  }, [ready, configured, session]);

  useFocusEffect(
    useCallback(() => {
      const userId = session?.user.id;
      if (!userId) return;
      let active = true;
      const pull = (first: boolean) => {
        void refresh()
          .catch((cause: unknown) => {
            if (!active) return;
            setError(cause instanceof Error ? cause.message : 'Could not open this chat');
          })
          .finally(() => {
            if (active && first) setLoading(false);
          });
      };
      setLoading(true);
      pull(true);
      const timer = setInterval(() => pull(false), 20000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [refresh, session?.user.id]),
  );

  const watchKey = thread?.sessionIds.join(',') || sessionId;
  useEffect(() => {
    let wait: ReturnType<typeof setTimeout> | null = null;
    const stop = watchThreads(watchKey.split(',').filter(Boolean), () => {
      if (wait) return;
      wait = setTimeout(() => {
        wait = null;
        void refresh();
      }, 200);
    });
    return () => {
      stop();
      if (wait) clearTimeout(wait);
    };
  }, [refresh, watchKey]);

  const name = thread?.title || fallbackName;
  const color = thread?.color || fallbackColor;
  const messages = thread?.messages ?? [];

  async function submit(text: string, action?: ActionDecision, mail?: MailDraftDecision) {
    if (!thread || !session?.user.id || pending || sending.current) return;
    sending.current = true;
    const message = text.trim();
    if (!message && !action && !mail) return;
    const fromComposer = Boolean(message) && !action && !mail;
    setPending(true);
    setError(null);
    if (fromComposer) {
      stick.current = true;
      setOutgoing(message);
      setDraft('');
    }
    try {
      await sendChatTurn(thread, mail ? mail.decision : message, session.user.id, action, mail);
      await refresh();
      setOutgoing(null);
    } catch (cause: unknown) {
      setOutgoing(null);
      setError(cause instanceof Error ? cause.message : 'Nexus could not answer');
      if (fromComposer) setDraft(message);
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior="padding" automaticOffset style={styles.frame}>
          <ScrollView
            ref={(node) => {
              list.current = node;
            }}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: insets.top + 72, paddingBottom: composerHeight + 36 },
            ]}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              const distance = contentSize.height - layoutMeasurement.height - contentOffset.y;
              const close = distance < 80;
              nearBottom.current = close;
              if (!close) stick.current = false;
            }}
            onContentSizeChange={() => pin()}>
            {loading ? <ChatSkeleton /> : null}
            {!loading && !error && messages.length === 0 ? (
              <Text style={styles.empty}>Ask {name} anything. Replies land in this same Kinetic thread.</Text>
            ) : null}
            {messages.map((message) => (
              <ConsoleMessage
                key={message.id}
                message={message}
                messages={messages}
                viewerName={name}
                busy={pending}
                accent={color}
                showSetup={message.id === latestSetupId(messages)}
                onFollowup={(label) => void submit(label)}
                onMail={(draft) => void submit('', undefined, draft)}
                onAction={(decision) => void submit(decision.decision, decision)}
                onDecision={(decision) => {
                  const pendingAction = message.pending;
                  if (!pendingAction) return;
                  void submit(decision === 'approve' ? 'Approved' : 'Rejected', {
                    id: pendingAction.id,
                    decision,
                  });
                }}
              />
            ))}
            {outgoing && !messages.some((message) => message.role === 'user' && message.content.trim() === outgoing) ? (
              <View style={[styles.outgoing, { backgroundColor: color }]}>
                <Text style={[styles.outgoingText, { color: '#FFFFFF' }]}>{outgoing}</Text>
              </View>
            ) : null}
          </ScrollView>

          <TopFade color={ink.bg} solid={insets.top} fade={20} />
          <BottomFade
            color={ink.bg}
            solid={keyboardHeight > 0 ? 0 : Math.max(insets.bottom - 20, 0)}
            fade={keyboardHeight > 0 ? 0 : Math.min(20, insets.bottom)}
          />
          <View style={[styles.header, { top: insets.top + Space[2] }]} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
              <Icon ios="chevron.left" android="chevron_left" size={22} color={ink.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${name} details`}
              onPress={() =>
                router.push({
                  pathname: '/agent/[id]',
                  params: { id: sessionId, color: color.replace('#', '') },
                })
              }
              style={({ pressed }) => [styles.identity, pressed && styles.pressed]}>
              <Bloub size={26} color={color} mood="idle" />
              <Text style={styles.identityName} numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More"
              onPress={() =>
                Alert.alert(name, 'This is the same Nexus chat as Kinetic. Messages, tools, and confirmations stay on this agent.')
              }
              style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
              <Icon ios="ellipsis" android="more_horiz" size={20} color={ink.text} />
            </Pressable>
          </View>

          <View
            style={{ marginTop: -composerHeight }}
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              setComposerHeight((current) => (Math.abs(current - height) < 1 ? current : height));
              pin();
            }}>
            {pending || thread?.activity ? (
              <View style={styles.thinkingDock} accessibilityLabel={`${name} is working`}>
                <ThinkingLine text={thread?.activity?.replace(/…$/, '') || 'Thinking'} />
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <ChatComposer
              value={draft}
              onChangeText={setDraft}
              placeholder={`Ask ${name}`}
              accent={color}
              busy={pending}
              bottomInset={keyboardHeight > 0 ? Space[2] : Math.max(insets.bottom, Space[2])}
              onAttach={() =>
                Alert.alert('Add to this chat', 'Photos and files are sent from the Kinetic console. Type a message here and Nexus uses the same tools.')
              }
              onMicrophone={() => Alert.alert('Voice', 'Voice input is not available on the phone yet.')}
              onVoice={() => Alert.alert('Voice', 'Voice input is not available on the phone yet.')}
            onSubmit={() => void submit(draft)}
          />
          </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function latestSetupId(messages: ChatThread['messages']) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const setup = messages[index]?.metadata.setup;
    if (setup && typeof setup === 'object' && Array.isArray((setup as { checklist?: unknown }).checklist)) {
      return messages[index]?.id ?? null;
    }
  }
  return null;
}

function Icon({
  ios,
  android,
  size,
  color,
}: {
  ios: SFSymbol;
  android: AndroidSymbol;
  size: number;
  color: string;
}) {
  return <SymbolView name={{ ios, android, web: android }} size={size} tintColor={color} weight="medium" />;
}

function ChatSkeleton() {
  const { styles } = useThemed(makeStyles);
  return (
    <View accessibilityLabel="Loading chat" style={styles.skeleton}>
      <Bone width="86%" height={72} radius={18} />
      <Bone width="48%" height={40} radius={18} style={styles.skeletonMine} />
      <Bone width="78%" height={96} radius={18} />
    </View>
  );
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.bg, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: ink.bg },
  header: {
    position: 'absolute',
    left: Space[3],
    right: Space[3],
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space[2],
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ink.surfaceRaised,
    borderWidth: 1,
    borderColor: ink.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    maxWidth: '68%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    minHeight: 44,
    paddingLeft: 6,
    paddingRight: Space[4],
    paddingVertical: 4,
    borderRadius: Radius.chip,
    backgroundColor: ink.surfaceRaised,
    borderWidth: 1,
    borderColor: ink.border,
  },
  identityName: { ...Type.agentName, color: ink.text, flexShrink: 1 },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: Space[4],
    paddingTop: 76,
    gap: Space[3],
  },
  skeleton: { gap: Space[3], marginTop: Space[2] },
  skeletonMine: { alignSelf: 'flex-end' },
  empty: { ...Type.body, color: ink.textMuted, textAlign: 'center', marginTop: Space[8] },
  bubble: { maxWidth: '92%', borderRadius: 22, paddingHorizontal: Space[4], paddingVertical: Space[3], gap: Space[2] },
  theirs: { alignSelf: 'stretch', backgroundColor: ink.surfaceRaised },
  mine: { alignSelf: 'flex-end', backgroundColor: ink.backgroundSelected, maxWidth: '78%' },
  tool: { ...Type.caption, color: ink.textMuted },
  noteRow: { alignItems: 'center', paddingVertical: Space[1] },
  note: { ...Type.meta, color: ink.textMuted, textAlign: 'center' },
  outgoing: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    borderRadius: 22,
    backgroundColor: ink.backgroundSelected,
    paddingHorizontal: Space[4],
    paddingVertical: Space[3],
  },
  outgoingText: { ...Type.chat, color: ink.text },
  thinkingDock: {
    marginHorizontal: Space[4],
    marginBottom: Space[2],
  },
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
  error: { ...Type.meta, color: ink.danger, paddingHorizontal: Space[4], paddingBottom: Space[2] },
  pressed: { opacity: 0.7 },
});
}
