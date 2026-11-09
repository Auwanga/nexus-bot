import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Space, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { signInWithKineticAccount, useSession } from '@/lib/auth';

export default function SignInScreen() {
  const colors = useTheme();
  const scheme = useColorScheme();
  const { session, ready } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace('/home');
  }, [ready, session]);

  async function onSubmit() {
    const trimmed = email.trim();
    if (!trimmed.includes('@') || !password) {
      setError('Enter the email and password for your Kinetic account.');
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = await signInWithKineticAccount(trimmed, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace('/home');
  }

  if (!ready || session) {
    return (
      <View style={[styles.screen, styles.boot, { backgroundColor: colors.bg }]}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.frame}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.back}>
              <Text style={[styles.backLabel, { color: colors.textMuted }]}>Back</Text>
            </Pressable>

            <Text style={[styles.title, { color: colors.text }]}>Sign in</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Use the email and password from your Kinetic account.
            </Text>

            <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@company.com"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            />

            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              disabled={submitting}
              onPress={() => void onSubmit()}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.accent,
                  opacity: submitting ? 0.6 : pressed ? 0.86 : 1,
                },
              ]}>
              {submitting ? (
                <ActivityIndicator color={colors.userBubbleText} />
              ) : (
                <Text style={[styles.buttonLabel, { color: colors.userBubbleText }]}>Sign in</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  boot: {
    justifyContent: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Space[6],
    paddingBottom: Space[8],
  },
  back: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...Type.body,
  },
  title: {
    ...Type.h1,
    marginTop: Space[4],
  },
  subtitle: {
    ...Type.body,
    marginTop: Space[2],
    marginBottom: Space[8],
  },
  label: {
    ...Type.meta,
    marginBottom: Space[2],
  },
  input: {
    ...Type.body,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Space[4],
    marginBottom: Space[5],
  },
  error: {
    ...Type.meta,
    marginBottom: Space[4],
  },
  button: {
    minHeight: 56,
    borderRadius: Radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Space[2],
  },
  buttonLabel: {
    ...Type.body,
    fontWeight: '600',
  },
});
