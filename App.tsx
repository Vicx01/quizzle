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
import { onAuthStateChanged, signInWithGoogle } from './services/auth';
import { isAuthConfigured } from './services/auth';
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

  useEffect(() => {
    if (!isAuthConfigured()) {
      setAuthState('signed-out');
      return;
    }
    const unsubscribe = onAuthStateChanged(user => {
      setAuthState(user ? 'signed-in' : 'signed-out');
      setAuthError(null);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = useCallback(async () => {
    if (!isAuthConfigured()) {
      setAuthError(
        'Sign-in is not configured. Set the EXPO_PUBLIC_FIREBASE_* environment variables to enable Google sign-in.'
      );
      return;
    }
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      // onAuthStateChanged flips authState to 'signed-in'.
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.');
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
          <SignInScreen onSignIn={handleSignIn} error={authError} loading={signingIn} />
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
