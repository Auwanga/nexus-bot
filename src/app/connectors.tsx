import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectorMark } from '@/components/connector-mark';
import { Bone } from '@/components/bone';
import { Radius, Space, Type } from '@/constants/theme';
import { fadeColor, useThemed, type Palette } from '@/lib/appearance';
import { useSession } from '@/lib/auth';
import {
  CONNECTOR_CATEGORIES,
  CONNECTORS,
  loadConnectorState,
  startConnector,
  type ConnectorApp,
  type ConnectorCategory,
} from '@/lib/connectors';

export default function ConnectorsScreen() {
  const { scheme, ink, styles } = useThemed(makeStyles);
  const { session, ready, configured } = useSession();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CONNECTOR_CATEGORIES)[number]>('All');
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;
    const state = await loadConnectorState(userId);
    setBusinessId(state.businessId);
    setEnabled(state.enabled);
    setConnected(new Set(state.connected));
    setError(null);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      if (ready && configured && !session) {
        router.replace('/sign-in');
        return;
      }
      let active = true;
      void refresh()
        .catch((cause: unknown) => {
          if (!active) return;
          setError(cause instanceof Error ? cause.message : 'Could not load apps');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [configured, ready, refresh, session]),
  );

  const needle = query.trim().toLowerCase();
  const visible = CONNECTORS.filter((app) => {
    if (category !== 'All' && app.category !== category) return false;
    if (!needle) return true;
    return app.title.toLowerCase().includes(needle) || app.blurb.toLowerCase().includes(needle);
  });
  const recommended = category === 'All' && !needle ? visible.filter((app) => app.recommended) : [];
  const recommendedIds = new Set(recommended.map((app) => app.id));
  const sections: { label: string; apps: ConnectorApp[] }[] =
    needle || category !== 'All'
      ? [{ label: category === 'All' ? 'Apps' : category, apps: visible }]
      : (['Communication', 'Productivity', 'Payments', 'Design', 'Stores'] as ConnectorCategory[])
          .map((label) => ({
            label,
            apps: visible.filter((app) => app.category === label && !recommendedIds.has(app.id)),
          }))
          .filter((section) => section.apps.length > 0);

  async function connect(app: ConnectorApp) {
    if (!app.available || connected.has(app.id) || opening) return;
    if (app.id === 'whatsapp') {
      Alert.alert(
        'Kinetic WhatsApp',
        'WhatsApp links as a device from the Kinetic console, the same way WhatsApp Web does.',
      );
      return;
    }
    if (!businessId) {
      setError('This account has no workspace yet.');
      return;
    }
    if (!enabled) {
      setError('App connections are not turned on for this workspace.');
      return;
    }
    setOpening(app.id);
    setError(null);
    try {
      await startConnector(businessId, app.id);
      await refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not start the connection');
    } finally {
      setOpening(null);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.frame} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Text style={styles.closeLabel}>×</Text>
          </Pressable>
          <Text style={styles.title}>Connect apps</Text>
          <View style={styles.countPill}>
            {loading ? <Bone width={72} height={14} radius={7} /> : <Text style={styles.count}>{`${connected.size} connected`}</Text>}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filterRow}>
          {CONNECTOR_CATEGORIES.map((item) => {
            const selected = item === category;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setCategory(item)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.body}>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {recommended.length > 0 ? (
              <Section title="For you" apps={recommended} connected={connected} opening={opening} onConnect={connect} />
            ) : null}
            {sections.map((section) => (
              <Section
                key={section.label}
                title={section.label}
                apps={section.apps}
                connected={connected}
                opening={opening}
                onConnect={connect}
              />
            ))}
            {!loading && visible.length === 0 ? <Text style={styles.empty}>No apps match that search.</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <LinearGradient
            pointerEvents="none"
            colors={[fadeColor(ink.bg, 1), fadeColor(ink.bg, 0.45), fadeColor(ink.bg, 0)]}
            locations={[0, 0.55, 1]}
            style={styles.topFade}
          />

          <View pointerEvents="box-none" style={styles.searchDock}>
            <LinearGradient
              pointerEvents="none"
              colors={[fadeColor(ink.bg, 0), fadeColor(ink.bg, 0.45), fadeColor(ink.bg, 1)]}
              locations={[0, 0.45, 1]}
              style={styles.fade}
            />
            <SafeAreaView edges={['bottom']} style={styles.searchWrap}>
              <View style={styles.search}>
                <View style={styles.magnifier}>
                  <View style={styles.magnifierRing} />
                  <View style={styles.magnifierHandle} />
                </View>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search across apps"
                  placeholderTextColor={ink.textMuted}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  underlineColorAndroid="transparent"
                />
              </View>
            </SafeAreaView>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Section({
  title,
  apps,
  connected,
  opening,
  onConnect,
}: {
  title: string;
  apps: readonly ConnectorApp[];
  connected: Set<string>;
  opening: string | null;
  onConnect: (app: ConnectorApp) => void;
}) {
  const { styles } = useThemed(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {apps.map((app) => {
        const done = connected.has(app.id);
        const label = !app.available ? 'Soon' : opening === app.id ? 'Opening…' : done ? 'Connected' : 'Connect';
        return (
          <View key={app.id} style={styles.row}>
            <ConnectorMark id={app.id} />
            <View style={styles.rowBody}>
              <Text style={styles.name} numberOfLines={1}>
                {app.title}
              </Text>
              <Text style={styles.blurb} numberOfLines={1}>
                {app.blurb}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label} ${app.title}`}
              disabled={!app.available || done || opening === app.id}
              onPress={() => onConnect(app)}
              style={({ pressed }) => [styles.connect, done && styles.connected, pressed && styles.pressed]}>
              <Text style={[styles.connectLabel, done && styles.connectedLabel]}>{label}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.bg, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: ink.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    paddingHorizontal: Space[4],
    paddingTop: Space[2],
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ink.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: { color: ink.text, fontSize: 26, lineHeight: 28, marginTop: -2 },
  title: { ...Type.title, color: ink.text, flex: 1 },
  countPill: {
    borderRadius: Radius.chip,
    backgroundColor: ink.surfaceRaised,
    paddingHorizontal: Space[3],
    paddingVertical: Space[2],
  },
  count: { ...Type.meta, color: ink.text },
  filterRow: { flexGrow: 0, marginTop: Space[4] },
  filters: { paddingHorizontal: Space[4], gap: Space[2] },
  chip: {
    borderRadius: Radius.chip,
    backgroundColor: ink.surface,
    paddingHorizontal: Space[4],
    paddingVertical: Space[2],
  },
  chipSelected: { backgroundColor: ink.button },
  chipLabel: { ...Type.meta, color: ink.text },
  chipLabelSelected: { color: ink.buttonText },
  list: { flex: 1 },
  body: { flex: 1, marginTop: Space[4] },
  listContent: { paddingHorizontal: Space[4], paddingTop: Space[2], paddingBottom: 88, gap: Space[6] },
  section: { gap: Space[4] },
  sectionTitle: { ...Type.title, color: ink.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space[3] },
  rowBody: { flex: 1, gap: 2 },
  name: { ...Type.body, color: ink.text, fontWeight: '600' },
  blurb: { ...Type.caption, color: ink.textMuted },
  connect: {
    borderRadius: Radius.chip,
    backgroundColor: ink.surfaceRaised,
    paddingHorizontal: Space[4],
    paddingVertical: Space[2],
    minWidth: 96,
    alignItems: 'center',
  },
  connected: { backgroundColor: ink.surface },
  connectLabel: { ...Type.meta, color: ink.text },
  connectedLabel: { color: ink.textMuted },
  empty: { ...Type.body, color: ink.textMuted, textAlign: 'center' },
  error: { ...Type.meta, color: ink.danger },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 36 },
  searchDock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fade: { height: 36 },
  searchWrap: { backgroundColor: ink.bg, paddingHorizontal: Space[4], paddingBottom: Space[2], marginTop: -1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
    minHeight: 48,
    paddingHorizontal: Space[4],
    backgroundColor: ink.surface,
    borderRadius: Radius.chip,
  },
  searchInput: {
    flex: 1,
    ...Type.body,
    color: ink.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
  },
  magnifier: { width: 16, height: 16 },
  magnifierRing: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: ink.textMuted,
  },
  magnifierHandle: {
    position: 'absolute',
    width: 6,
    height: 1.5,
    backgroundColor: ink.textMuted,
    right: 0,
    bottom: 2,
    transform: [{ rotate: '45deg' }],
  },
  pressed: { opacity: 0.7 },
});
}
