/**
 * Quizzle — App root (application shell).
 *
 * Wraps the app in ThemeProvider and manages Firebase Auth state.
 * When unauthenticated: shows the SignIn screen.
 * When authenticated: shows the main tab navigation with the Generate screen active.
 *
 * History / Share / Account tabs are explicit placeholders — they render an honest
 * "not yet implemented" state rather than fake data or dead controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { GenerateScreen } from './screens/Generate';
import { SignInScreen } from './screens/SignIn';
import {
  onAuthStateChanged,
  signInWithGoogle,
  isAuthConfigured,
  consumeRedirectResult,
  describeAuthErrorWithCode,
  isCancellation,
  getCurrentOrigin,
  isEmbeddedInFrame,
} from './services/auth';
import { getFirebaseConfigStatus, type ConfigStatus } from './services/firebase';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { space, fontSize } from './theme/tokens';

type TabKey = 'generate' | 'history' | 'share' | 'account';

function PlaceholderScreen({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.placeholder, { backgroundColor: colors.background }]}
      accessibilityRole="text"
    >
      <Text style={[styles.placeholderTitle, { color: colors.textPrimary }]}>{label}</Text>
      <Text style={[styles.placeholderBody, { color: colors.textSecondary }]}>
        This screen is not implemented yet. It is part of a later phase.
      </Text>
    </View>
  );
}

export default function App() {
  // All hooks are declared unconditionally at the top — no conditional hook calls.
  const [authState, setAuthState] = useState<'loading' | 'signed-out' | 'signed-in'>(
    isAuthConfigured() ? 'loading' : 'signed-out'
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('generate');
  const { isConnected } = useNetworkStatus();

  // Read once: env vars are inlined at build time, so this cannot change at
  // runtime, but recomputing keeps the value stable across re-renders.
  const [configStatus] = useState<ConfigStatus>(() => getFirebaseConfigStatus());

  // Sign-in environment, surfaced on the sign-in screen. Read once — the origin
  // and framing cannot change without a fresh page load.
  const [signInEnv] = useState(() => ({
    origin: getCurrentOrigin(),
    embedded: isEmbeddedInFrame(),
  }));

  useEffect(() => {
    if (!isAuthConfigured()) {
      setAuthState('signed-out');
      return;
    }

    // Pick up the result of a redirect sign-in from a previous page load.
    // This runs once on startup; see consumeRedirectResult() for why it cannot
    // be awaited inside the sign-in handler.
    void consumeRedirectResult();

    const unsubscribe = onAuthStateChanged(user => {
      setAuthState(user ? 'signed-in' : 'signed-out');
      setAuthError(null);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = useCallback(async () => {
    if (!isAuthConfigured()) {
      // Should not be reachable: the sign-in button is replaced by the setup
      // checklist when configuration is incomplete.
      setAuthError('Firebase is not configured. See the setup checklist above.');
      return;
    }
    setSigningIn(true);
    setAuthError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        // onAuthStateChanged will also flip this; setting it here avoids a
        // flash of the sign-in screen.
        setAuthState('signed-in');
      }
      // If null, a redirect was started and the page will reload.
    } catch (error: unknown) {
      // A user-initiated cancel is not an error worth showing.
      if (!isCancellation(error)) {
        setAuthError(describeAuthErrorWithCode(error));
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  return (
    <ThemeProvider>
      <View style={styles.root}>
        <StatusBar barStyle="auto" />

        {authState === 'loading' ? (
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : authState === 'signed-out' ? (
          <SignInScreen
            onSignIn={handleSignIn}
            error={authError}
            loading={signingIn}
            configStatus={configStatus}
            origin={signInEnv.origin}
            embedded={signInEnv.embedded}
          />
        ) : activeTab === 'generate' ? (
          <GenerateScreen
            onTabChange={key => setActiveTab(key as TabKey)}
            // Quota comes from the backend, which is not implemented yet.
            // Passing null renders no indicator rather than an invented one.
            quota={null}
            offline={!isConnected}
          />
        ) : (
          <PlaceholderScreen label={activeTab} />
        )}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
  },
  placeholder: {
    alignItems: 'center',
    flex: 1,
    gap: space[3],
    justifyContent: 'center',
    padding: space[8],
  },
  placeholderBody: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  placeholderTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  root: {
    flex: 1,
  },
});
