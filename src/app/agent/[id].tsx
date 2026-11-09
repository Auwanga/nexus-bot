import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bloub, useBloubReady } from '@/components/bloub';
import { Bone } from '@/components/bone';
import { Radius, Space, Type } from '@/constants/theme';
import { useThemed, type Palette } from '@/lib/appearance';
import { loadAgentInfo, saveTopAgentRole, type AgentInfo } from '@/lib/agent-info';

export default function AgentScreen() {
  const { scheme, styles } = useThemed(makeStyles);
  const params = useLocalSearchParams<{ id: string; color?: string }>();
  const sessionId = String(params.id ?? '');
  const color = `#${String(params.color ?? '3ecf8e').replace('#', '')}`;
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<'library' | 'computer' | null>('library');
  const [editing, setEditing] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [duties, setDuties] = useState('');
  const [saving, setSaving] = useState(false);
  const cloudsReady = useBloubReady();

  const refresh = useCallback(async () => {
    const next = await loadAgentInfo(sessionId);
    setInfo(next);
    setPurpose(next.purpose);
    setDuties(next.duties);
    setError(null);
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void refresh().catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Could not open this agent');
      });
      return () => {
        active = false;
      };
    }, [refresh]),
  );

  async function save() {
    if (!info?.topAgent || saving) return;
    setSaving(true);
    try {
      await saveTopAgentRole(info.id, purpose, duties);
      setEditing(false);
      await refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not save the role');
    } finally {
      setSaving(false);
    }
  }

  const subtitle = [info?.kind, info?.businessName].filter(Boolean).join(' · ');

  return (
    <View style={styles.screen}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.frame} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.round}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info && cloudsReady ? (
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <View style={styles.face}>
                <Bloub size={92} color={color} />
                {info.topAgent ? (
                  <View style={styles.star}>
                    <Text style={styles.starLabel}>★</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Text style={styles.name}>{info.name}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {info.topAgent ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => (editing ? void save() : setEditing(true))}
                style={styles.edit}>
                <Text style={styles.editLabel}>{saving ? 'Saving…' : editing ? 'Save' : 'Edit'}</Text>
              </Pressable>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.section}>Purpose</Text>
              {editing ? (
                <TextInput value={purpose} onChangeText={setPurpose} multiline style={styles.field} />
              ) : (
                <Text style={styles.copy}>{info.purpose || 'No purpose yet.'}</Text>
              )}
              {info.topAgent || editing ? <View style={styles.rule} /> : null}
              {info.topAgent || editing ? <Text style={styles.section}>Day to day</Text> : null}
              {info.topAgent && editing ? (
                <TextInput value={duties} onChangeText={setDuties} multiline style={styles.field} />
              ) : info.duties ? (
                <Text style={styles.copy}>{info.duties}</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Row
                label="Library"
                value={info.files.length > 0 ? String(info.files.length) : ''}
                open={open === 'library'}
                onPress={() => setOpen(open === 'library' ? null : 'library')}
              />
              {open === 'library' ? (
                info.files.length > 0 ? (
                  info.files.map((file) => (
                    <Text key={file.id} style={styles.file}>
                      {file.name}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.hint}>
                    Files you attach in chat are kept here and brought back when a later conversation needs them.
                  </Text>
                )
              ) : null}
              <View style={styles.rule} />
              <Row
                label="Computer"
                value="Waking up…"
                open={open === 'computer'}
                onPress={() => setOpen(open === 'computer' ? null : 'computer')}
              />
              {open === 'computer' ? <Text style={styles.hint}>Waking up…</Text> : null}
              <View style={styles.rule} />
              <Pressable accessibilityRole="button" onPress={() => router.push('/connectors')} style={styles.row}>
                <Text style={styles.rowLabel}>Connect apps</Text>
                <Chevron direction="right" />
              </Pressable>
            </View>
          </ScrollView>
        ) : error ? null : (
          <AgentSkeleton />
        )}
      </SafeAreaView>
    </View>
  );
}

function AgentSkeleton() {
  const { styles } = useThemed(makeStyles);
  return (
    <View accessibilityLabel="Loading agent" style={styles.body}>
      <View style={styles.hero}>
        <Bone width={92} height={92} radius={46} />
      </View>
      <Bone width={120} height={22} radius={8} />
      <Bone width={160} height={14} radius={8} />
      <View style={styles.card}>
        <Bone width="30%" height={14} />
        <Bone width="100%" height={14} />
        <Bone width="82%" height={14} />
      </View>
      <View style={styles.card}>
        <Bone width="40%" height={16} />
        <Bone width="100%" height={12} />
      </View>
    </View>
  );
}

function Row({ label, value, open, onPress }: { label: string; value: string; open: boolean; onPress: () => void }) {
  const { styles } = useThemed(makeStyles);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Chevron direction={open ? 'down' : 'right'} />
    </Pressable>
  );
}

function Chevron({ direction }: { direction: 'right' | 'down' }) {
  const { styles } = useThemed(makeStyles);
  return <View style={[styles.chevronMark, direction === 'down' ? styles.chevronDown : styles.chevronRight]} />;
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.bg },
  frame: { flex: 1 },
  header: { paddingHorizontal: Space[3], paddingBottom: Space[2] },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ink.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { color: ink.text, fontSize: 28, lineHeight: 30, marginTop: -2 },
  error: { ...Type.meta, color: ink.danger, paddingHorizontal: Space[4] },
  body: { alignItems: 'center', paddingHorizontal: Space[4], paddingBottom: Space[8], gap: Space[3] },
  hero: { marginTop: Space[4], marginBottom: Space[2] },
  face: { position: 'relative' },
  star: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F5A524',
    borderWidth: 2,
    borderColor: ink.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starLabel: { color: '#1A1204', fontSize: 12, fontWeight: '700', marginTop: -1 },
  name: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: ink.text, textAlign: 'center' },
  subtitle: { ...Type.meta, color: ink.textMuted, textAlign: 'center' },
  edit: {
    borderRadius: Radius.chip,
    backgroundColor: ink.surfaceRaised,
    paddingHorizontal: Space[4],
    paddingVertical: Space[2],
  },
  editLabel: { ...Type.meta, color: ink.text, fontWeight: '600' },
  card: {
    alignSelf: 'stretch',
    borderRadius: 16,
    backgroundColor: ink.surface,
    paddingHorizontal: Space[4],
    paddingVertical: Space[3],
    gap: Space[2],
  },
  section: { ...Type.caption, color: ink.textMuted, fontWeight: '600' },
  copy: { ...Type.body, color: ink.text },
  field: {
    ...Type.body,
    color: ink.text,
    minHeight: 72,
    textAlignVertical: 'top',
    borderBottomWidth: 1,
    borderBottomColor: ink.border,
  },
  rule: { height: 1, backgroundColor: ink.border, marginVertical: Space[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space[3], minHeight: 48 },
  rowLabel: { ...Type.body, color: ink.text, flex: 1 },
  rowValue: { ...Type.meta, color: ink.textMuted },
  chevronMark: {
    width: 8,
    height: 8,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: ink.textMuted,
  },
  chevronRight: { transform: [{ rotate: '45deg' }] },
  chevronDown: { transform: [{ rotate: '135deg' }], marginTop: -3 },
  file: { ...Type.meta, color: ink.text, paddingVertical: 4 },
  hint: { ...Type.meta, color: ink.textMuted },
});
}
