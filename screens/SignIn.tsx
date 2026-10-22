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
 * - Error: inline message below button, supplied by `error` prop.
 *
 * Responsive: Full-width card on mobile; centered max-width 400 px on desktop.
 * Accessibility: Button has an accessibility label; focus visible; Enter/Space activates.
 */

import React from 'react';
import {
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

interface SignInScreenProps {
  onSignIn: () => void;
  /** Inline error shown below the button (set to null to clear). */
  error?: string | null;
  /** True while the sign-in request is in flight. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SignInScreen({ onSignIn, error, loading, style }: SignInScreenProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);

  const styles = getStyles(colors, isDesktop);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.card}>
        <Text style={styles.wordmark}>quizzle</Text>
        <Text style={styles.heading}>Sign in to Quizzle</Text>
        <Text style={styles.subtitle}>Continue with your Google account.</Text>

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

        <View style={styles.links}>
          <Text style={styles.linkText}>Privacy policy</Text>
          <Text style={styles.linkText}>·</Text>
          <Text style={styles.linkText}>Terms of service</Text>
        </View>
      </View>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>, isDesktop: boolean) {
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
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: space[4],
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
      flexDirection: 'row',
      gap: space[2],
      marginTop: space[6],
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
