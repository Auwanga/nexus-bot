import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountAvatar } from '@/components/account-avatar';
import { Bloub, useBloubReady } from '@/components/bloub';
import { Bone } from '@/components/bone';
import { Space, Type } from '@/constants/theme';
import { useThemed, type Palette } from '@/lib/appearance';
import { useSession } from '@/lib/auth';
import { loadHomeTeam, type HomeAgent, type HomeTeam } from '@/lib/home-team';
import { watchHome } from '@/lib/live';

export default function HomeScreen() {
  const { scheme, ink, styles } = useThemed(makeStyles);
  const { session, ready, configured } = useSession();
  const [query, setQuery] = useState('');
  const [team, setTeam] = useState<HomeTeam | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const cloudsReady = useBloubReady();
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && configured && !session) router.replace('/sign-in');
  }, [ready, configured, session]);

  const reloadTeam = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) return Promise.resolve();
    return loadHomeTeam(userId)
      .then((next) => {
        setTeam(next);
        setTeamError(null);
      })
      .catch((error: unknown) => {
        setTeamError(error instanceof Error ? error.message : 'Could not load agents');
      });
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) return;
      let active = true;
      void reloadTeam().finally(() => {
        if (active) setLoadingTeam(false);
      });
      return () => {
        active = false;
      };
    }, [reloadTeam, session?.user.id]),
  );

  useEffect(() => {
    const businessId = team?.businessId;
    if (!businessId) return;
    let wait: ReturnType<typeof setTimeout> | null = null;
    const stop = watchHome(businessId, () => {
      if (wait) return;
      wait = setTimeout(() => {
        wait = null;
        void reloadTeam();
      }, 200);
    });
    return () => {
      stop();
      if (wait) clearTimeout(wait);
    };
  }, [reloadTeam, team?.businessId]);

  const rows = useMemo(() => {
    const others = team?.others ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return others;
    return others.filter(
      (agent) =>
        agent.name.toLowerCase().includes(needle) || agent.preview.toLowerCase().includes(needle),
    );
  }, [query, team]);

  const businessName = team?.businessName ?? 'Workspace';
  const featured = team?.featured ?? null;

  function openChat(agent: HomeAgent | null) {
    if (!agent || agent.id === 'nexus') return;
    router.push({
      pathname: '/chat/[id]',
      params: { id: agent.id, name: agent.name, color: agent.color.replace('#', '') },
    });
  }

  return (
    <View style={styles.screen}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.frame}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={() => router.push('/account')}
            style={({ pressed }) => [styles.workspace, pressed && styles.pressed]}>
            <AccountAvatar seed={session?.user.id ?? businessName} size={40} fallback={businessName} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Text style={styles.plus}>+</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {teamError ? (
            <Text style={styles.statusText}>{teamError}</Text>
          ) : loadingTeam || !cloudsReady ? (
            <HomeSkeleton />
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${featured?.name ?? 'Nexus'}`}
                onPress={() => openChat(featured)}
                style={({ pressed }) => [styles.featured, pressed && styles.pressed]}>
                <View style={styles.face}>
                  <Bloub size={112} color={featured?.color ?? '#3ecf8e'} mood="idle" />
                  <View style={styles.starBadge}>
                    <Text style={styles.star}>★</Text>
                  </View>
                </View>
                <Text style={styles.featuredName} numberOfLines={1}>
                  {featured?.name ?? 'Nexus'}
                </Text>
              </Pressable>
              {rows.map((agent: HomeAgent) => (
                <Pressable
                  key={agent.id}
                  accessibilityRole="button"
                  accessibilityLabel={agent.name}
                  onPress={() => openChat(agent)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <Bloub size={46} color={agent.color} mood="idle" />
                  <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowName}>{agent.name}</Text>
                      <Text style={styles.rowWhen}>{agent.when}</Text>
                    </View>
                    <Text style={styles.rowPreview} numberOfLines={1}>
                      {agent.preview}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.dock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Connect apps"
            onPress={() => router.push('/connectors')}
            style={({ pressed }) => [styles.appsButton, pressed && styles.pressed]}>
            <View style={styles.appsGrid}>
              <View style={styles.appsCell} />
              <View style={styles.appsCell} />
              <View style={styles.appsCell} />
              <View style={styles.appsPlus}>
                <Text style={styles.appsPlusLabel}>+</Text>
              </View>
            </View>
          </Pressable>
          <View style={styles.search}>
            <View style={styles.magnifier}>
              <View style={styles.magnifierRing} />
              <View style={styles.magnifierHandle} />
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={ink.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function HomeSkeleton() {
  const { styles } = useThemed(makeStyles);
  return (
    <View accessibilityLabel="Loading agents">
      <View style={styles.featured}>
        <Bone width={112} height={112} radius={56} />
        <Bone width={96} height={16} radius={8} />
      </View>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.row}>
          <Bone width={46} height={46} radius={23} />
          <View style={styles.skeletonCopy}>
            <Bone width="42%" height={14} />
            <Bone width="70%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ink.bg,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: ink.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space[5],
    paddingTop: Space[2],
  },
  workspace: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    color: ink.text,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '400',
    marginTop: -2,
  },
  pressed: {
    opacity: 0.72,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Space[6],
  },
  status: {
    marginTop: Space[8],
  },
  statusText: {
    ...Type.body,
    color: ink.textMuted,
    textAlign: 'center',
    marginTop: Space[8],
    paddingHorizontal: Space[6],
  },
  featured: {
    alignItems: 'center',
    marginTop: Space[6],
    marginBottom: Space[8],
    gap: Space[3],
  },
  face: {
    width: 112,
    height: 112,
  },
  starBadge: {
    position: 'absolute',
    right: 14,
    bottom: 18,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F5A524',
    borderWidth: 2,
    borderColor: ink.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    marginTop: -1,
  },
  featuredName: {
    ...Type.body,
    color: ink.text,
    fontWeight: '500',
    maxWidth: 220,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    paddingHorizontal: Space[5],
    paddingVertical: Space[3],
    minHeight: 72,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  skeletonCopy: {
    flex: 1,
    gap: Space[2],
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Space[3],
  },
  rowName: {
    ...Type.body,
    color: ink.text,
    fontWeight: '600',
  },
  rowWhen: {
    ...Type.meta,
    color: ink.textMuted,
  },
  rowPreview: {
    ...Type.meta,
    color: ink.textMuted,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[3],
    paddingHorizontal: Space[4],
    paddingTop: Space[2],
    paddingBottom: Space[2],
  },
  appsButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appsGrid: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  appsCell: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    backgroundColor: ink.text,
  },
  appsPlus: {
    width: 7,
    height: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appsPlusLabel: {
    color: ink.text,
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '600',
  },
  search: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[2],
  },
  magnifier: {
    width: 16,
    height: 16,
  },
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
  searchInput: {
    flex: 1,
    ...Type.body,
    color: ink.text,
    paddingVertical: Space[2],
  },
});
}
