/**
 * Quizzle — Sign-in screen (Google only).
 *
 * Hierarchy:
 * 1. Quizzle wordmark
 * 2. Heading: "Sign in to Quizzle"
 * 3. Subtitle: "Continue with your Google account."
 * 4. Primary button: "Sign in with Google"
 * 5. Secondary: "Privacy policy · Terms of service"
 *
 * Behaviour:
 * - Single Google-only sign-in. No email/password, no social alternatives.
 * - On success the auth state listener in the app shell redirects to Generate.
 * - Error: inline message below the button, mapped to an actionable cause.
 * - If Firebase is not configured, the sign-in button is REPLACED by an explicit
 *   setup checklist. We never render a button that cannot work.
 *
 * Responsive: Full-width card on mobile; centered max-width 400 px on desktop.
 * Accessibility: Button has an accessibility label; focus visible; Enter/Space activates.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, fontSize, fontWeight, radius, isDesktopWidth } from '../theme/tokens';
import { Button } from '../components/Button';
import type { ConfigProblem, ConfigStatus } from '../services/firebase';

interface SignInScreenProps {
  onSignIn: () => void;
  /** Inline error shown below the button (set to null to clear). */
  error?: string | null;
  /** True while the sign-in request is in flight. */
  loading?: boolean;
  /** When present and not `ok`, a setup checklist replaces the sign-in button. */
  configStatus?: ConfigStatus | null;
  /**
   * Current browser origin. Shown on screen so the value can be copied into
   * Firebase's Authorized Domains without reading the address bar — which is
   * not possible when the app runs inside an embedded preview.
   */
  origin?: string | null;
  /** True when the app is framed inside an embedded preview (e.g. an iframe). */
  embedded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SignInScreen({
  onSignIn,
  error,
  loading,
  configStatus,
  origin,
  embedded = false,
  style,
}: SignInScreenProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);
  const styles = getStyles(colors, isDesktop);

  const misconfigured = Boolean(configStatus && !configStatus.ok);

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.wordmark}>quizzle</Text>
        <Text style={styles.heading}>Sign in to Quizzle</Text>
        <Text style={styles.subtitle}>Continue with your Google account.</Text>

        {misconfigured ? (
          <SetupChecklist problems={configStatus!.errors} />
        ) : (
          <>
            {/* Single Google-only action. No email/password alternative by design. */}
            <Button
              variant="primary"
              label="Sign in with Google"
              fullWidth
              onPress={onSignIn}
              loading={loading}
              accessibilityLabel="Sign in with Google"
            />

            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <SignInDiagnostics origin={origin ?? null} embedded={embedded} />
          </>
        )}

        <View style={styles.links}>
          <Text style={styles.linkText}>Privacy policy</Text>
          <Text style={styles.linkText}>·</Text>
          <Text style={styles.linkText}>Terms of service</Text>
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Shown when Firebase is not configured. Lists exactly which variables are
 * missing and what to do, so nobody is left at a sign-in button that silently
 * fails.
 */
function SetupChecklist({ problems }: { problems: ConfigProblem[] }) {
  const colors = useColors();
  const styles = getStyles(colors, false);

  return (
    <View style={styles.setupPanel} accessibilityRole="alert" testID="firebase-setup-panel">
      <Text style={styles.setupTitle}>Finish Firebase setup</Text>
      <Text style={styles.setupBody}>
        Google sign-in needs Firebase credentials. These are missing or still placeholders:
      </Text>

      {problems.map(p => (
        <Text key={p.key} style={styles.setupItem}>
          • <Text style={styles.setupCode}>{p.key}</Text>
          {' — '}
          {p.message}
        </Text>
      ))}

      <Text style={styles.setupBody}>
        Create <Text style={styles.setupCode}>.env</Text> in the project root with the values from
        Firebase Console → Project settings → Your apps → SDK setup and configuration, then{' '}
        <Text style={styles.setupBold}>restart the dev server</Text>.
      </Text>

      <Text style={styles.setupHint}>Setup steps: docs/FIREBASE_SETUP.md</Text>
    </View>
  );
}

/**
 * On-screen diagnostics for the sign-in environment.
 *
 * This exists because the app is often viewed inside an embedded preview where
 * the address bar is not visible and popups are blocked. Two problems are
 * surfaced directly in the UI:
 *
 * 1. Being framed — Google refuses to render its consent pages inside a frame
 *    and popups are commonly blocked there, so sign-in cannot complete.
 * 2. The current origin — needed verbatim for Firebase's Authorized Domains
 *    allowlist, but otherwise only visible in the URL bar.
 */
function SignInDiagnostics({ origin, embedded }: { origin: string | null; embedded: boolean }) {
  const colors = useColors();
  const styles = getStyles(colors, false);

  return (
    <View
      style={[styles.diagPanel, embedded && styles.diagPanelWarning]}
      testID="signin-diagnostics"
    >
      {embedded ? (
        <>
          <Text style={styles.diagTitle} accessibilityRole="alert">
            Open in a new browser tab to sign in
          </Text>
          <Text style={styles.diagText}>
            This app is running inside an embedded frame. Google blocks its sign-in pages from being
            framed and popups are usually blocked there, so sign-in cannot finish in this view. Open
            the preview URL in a normal browser tab and try again.
          </Text>
        </>
      ) : null}

      {origin ? (
        <>
          <Text style={styles.diagText}>
            {
              'This app origin — add it to Firebase Console → Authentication → Settings → Authorized domains:'
            }
          </Text>
          <Text style={styles.diagOrigin} accessibilityRole="text">
            {origin}
          </Text>
        </>
      ) : null}

      <Text style={styles.diagHint}>
        If Google shows a 403, the usual causes are: the OAuth consent screen has not been completed
        (app name + support email), or the consent screen is in Testing mode and this account is not
        listed as a test user.
      </Text>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>, isDesktop: boolean) {
  // Keys are kept in alphabetical order to satisfy `react-native/sort-styles`.
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.small,
      borderWidth: 1,
      maxWidth: isDesktop ? 400 : undefined,
      padding: space[8],
      width: '100%',
    },
    container: {
      alignItems: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: space[4],
      paddingVertical: space[8],
    },
    diagHint: {
      color: colors.textTertiary,
      fontSize: fontSize.xs,
      marginTop: space[2],
    },
    diagOrigin: {
      color: colors.textPrimary,
      fontFamily: 'JetBrains Mono',
      fontSize: fontSize.sm,
      marginTop: space[1],
      textAlign: 'center',
    },
    diagPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.small,
      borderWidth: 1,
      gap: space[1],
      marginTop: space[6],
      padding: space[4],
      width: '100%',
    },
    diagPanelWarning: {
      backgroundColor: colors.warningMuted,
      borderColor: colors.warning,
    },
    diagText: {
      color: colors.textSecondary,
      fontSize: fontSize.xs,
    },
    diagTitle: {
      color: colors.warning,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    error: {
      color: colors.danger,
      fontSize: fontSize.xs,
      marginTop: space[3],
      textAlign: 'center',
    },
    heading: {
      color: colors.textPrimary,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      marginBottom: space[2],
      textAlign: 'center',
    },
    linkText: {
      color: colors.textSecondary,
      fontSize: fontSize.xs,
    },
    links: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: space[2],
      marginTop: space[6],
    },
    scroll: {
      backgroundColor: colors.background,
      flex: 1,
    },
    setupBody: {
      color: colors.textPrimary,
      fontSize: fontSize.sm,
    },
    setupBold: {
      color: colors.textPrimary,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
    },
    setupCode: {
      color: colors.textPrimary,
      fontFamily: 'JetBrains Mono',
      fontSize: fontSize.sm,
    },
    setupHint: {
      color: colors.textTertiary,
      fontSize: fontSize.xs,
      marginTop: space[2],
    },
    setupItem: {
      color: colors.textPrimary,
      fontSize: fontSize.sm,
    },
    setupPanel: {
      backgroundColor: colors.warningMuted,
      borderColor: colors.warning,
      borderRadius: radius.small,
      borderWidth: 1,
      gap: space[2],
      padding: space[4],
      width: '100%',
    },
    setupTitle: {
      color: colors.warning,
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: fontSize.base,
      marginBottom: space[8],
      textAlign: 'center',
    },
    wordmark: {
      color: colors.textPrimary,
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.semibold,
      marginBottom: space[6],
    },
  });
}
