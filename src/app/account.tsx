import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountAvatar } from '@/components/account-avatar';
import { Bone } from '@/components/bone';
import { Space, Type } from '@/constants/theme';
import { useThemed, type Palette } from '@/lib/appearance';
import { loadAccount, type AccountDetails } from '@/lib/account';
import { signOut, useSession } from '@/lib/auth';

export default function AccountScreen() {
  const { scheme, setScheme, styles } = useThemed(makeStyles);
  const { session, ready, configured } = useSession();
  const userId = session?.user.id ?? '';
  const email = session?.user.email ?? '';
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && configured && !session) router.replace('/sign-in');
  }, [configured, ready, session]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      void loadAccount(userId, email)
        .then((next) => {
          if (!active) return;
          setAccount(next);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (!active) return;
          setError(cause instanceof Error ? cause.message : 'Could not open the account');
        });
      return () => {
        active = false;
      };
    }, [email, userId]),
  );

  const planLine = account
    ? [account.plan, account.status, account.renews ? `until ${account.renews}` : ''].filter(Boolean).join(' · ')
    : '';

  return (
    <View style={styles.screen}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.frame} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.close}>
            <Text style={styles.closeMark}>×</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!account && !error ? <AccountSkeleton /> : null}
        {account ? (
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.identity}>
                <AccountAvatar seed={userId} size={44} fallback={account.name} />
                <View style={styles.identityCopy}>
                  <Text style={styles.identityName} numberOfLines={1}>
                    {account.name}
                  </Text>
                  <Text style={styles.identityEmail} numberOfLines={1}>
                    {account.email}
                  </Text>
                </View>
              </View>
              <View style={styles.rule} />
              <Row label="Workspace" value={account.workspace} />
              <View style={styles.rule} />
              <Row label="Usage" detail={`${account.messagesUsed.toLocaleString()} messages this period`} />
              <View style={styles.rule} />
              <Row label="Subscription" detail={planLine} />
              <View style={styles.rule} />
              <Row label="WhatsApp" detail={account.whatsapp} />
            </View>

            <Pressable accessibilityRole="button" onPress={() => router.push('/connectors')} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>Connect apps</Text>
                  <Text style={styles.rowDetail}>Gmail, Sheets, Drive, Calendar and the rest</Text>
                </View>
                <Chevron />
              </View>
            </Pressable>

            <Text style={styles.group}>Appearance</Text>
            <View style={styles.card}>
              <View style={styles.appearance}>
                {(['light', 'dark'] as const).map((option) => {
                  const selected = scheme === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setScheme(option)}
                      style={[styles.appearanceOption, selected && styles.appearanceOn]}>
                      <Text style={[styles.appearanceLabel, selected && styles.appearanceLabelOn]}>
                        {option === 'light' ? 'Light' : 'Dark'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text style={styles.group}>Workspace</Text>
            <View style={styles.card}>
              <Row label="Time zone" value="Africa/Windhoek" />
              <View style={styles.rule} />
              <Row label="Schedules" detail="Deliveries and meetings use the workspace clock" />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void signOut().then(() => router.replace('/'));
              }}
              style={styles.card}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>

            <View style={styles.footer}>
              <Image
                source={require('../../assets/bloub-cloud/bloub-default-cycle.gif')}
                style={[styles.mark, scheme === 'dark' ? { mixBlendMode: 'screen' } : null]}
                contentFit="contain"
                accessibilityLabel="Kinetic"
              />
              <Text style={styles.footerName}>Kinetic</Text>
              <Text style={styles.footerVersion}>1.0.0</Text>
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function AccountSkeleton() {
  const { styles } = useThemed(makeStyles);
  return (
    <View accessibilityLabel="Loading account" style={styles.body}>
      <View style={styles.card}>
        <View style={styles.identity}>
          <Bone width={44} height={44} radius={22} />
          <View style={styles.skeletonCopy}>
            <Bone width="55%" height={16} />
            <Bone width="72%" height={12} />
          </View>
        </View>
        {[0, 1, 2, 3].map((row) => (
          <View key={row}>
            <View style={styles.rule} />
            <View style={styles.skeletonRow}>
              <Bone width="28%" height={14} />
              <Bone width="24%" height={14} />
            </View>
          </View>
        ))}
      </View>
      <Bone width="100%" height={64} radius={16} />
    </View>
  );
}

function Row({ label, value, detail }: { label: string; value?: string; detail?: string }) {
  const { styles } = useThemed(makeStyles);
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <Chevron />
    </View>
  );
}

function Chevron() {
  const { styles } = useThemed(makeStyles);
  return <View style={styles.chevron} />;
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.bg },
  frame: { flex: 1 },
  header: { paddingHorizontal: Space[4], paddingBottom: Space[2] },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ink.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMark: { color: ink.text, fontSize: 26, lineHeight: 28, marginTop: -2 },
  skeletonCopy: { flex: 1, gap: Space[2] },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space[3],
  },
  error: { ...Type.meta, color: ink.danger, paddingHorizontal: Space[4] },
  body: { paddingHorizontal: Space[4], paddingBottom: Space[8], gap: Space[3] },
  card: {
    borderRadius: 18,
    backgroundColor: ink.surface,
    paddingHorizontal: Space[4],
    paddingVertical: Space[1],
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Space[3], minHeight: 68 },
  identityCopy: { flex: 1 },
  identityName: { ...Type.body, color: ink.text, fontWeight: '600' },
  identityEmail: { ...Type.meta, color: ink.textMuted },
  rule: { height: 1, backgroundColor: ink.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space[3], minHeight: 56 },
  rowCopy: { flex: 1, gap: 2 },
  rowLabel: { ...Type.body, color: ink.text, fontWeight: '600' },
  rowDetail: { ...Type.meta, color: ink.textMuted },
  rowValue: { ...Type.meta, color: ink.textMuted, maxWidth: '46%' },
  chevron: {
    width: 8,
    height: 8,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: ink.textMuted,
    transform: [{ rotate: '45deg' }],
  },
  group: { ...Type.meta, color: ink.textMuted, marginTop: Space[2], marginLeft: Space[2] },
  appearance: {
    flexDirection: 'row',
    gap: Space[2],
    paddingVertical: Space[3],
  },
  appearanceOption: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.bg,
  },
  appearanceOn: { backgroundColor: ink.button },
  appearanceLabel: { ...Type.meta, color: ink.text, fontWeight: '600' },
  appearanceLabelOn: { color: ink.buttonText },
  signOut: { ...Type.body, color: '#E85D5D', fontWeight: '600', paddingVertical: Space[4] },
  footer: { alignItems: 'center', gap: 2, paddingTop: Space[6] },
  mark: { width: 96, height: 96, marginBottom: Space[3] },
  footerName: { ...Type.body, color: ink.text, fontWeight: '700' },
  footerVersion: { ...Type.caption, color: ink.textMuted },
});
}
