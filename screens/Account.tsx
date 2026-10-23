/**
 * Quizzle — Account screen.
 *
 * Shows who is signed in and provides the only way out: Sign out.
 *
 * Presentational by design. The app shell owns auth state and passes the
 * handler, so this screen is testable without touching the auth provider.
 *
 * Sign-out failures are shown inline and leave the user signed in. Swallowing
 * the error would strand them in an account they cannot leave; optimistically
 * flipping to the sign-in screen would claim a state that did not happen.
 */

import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { AppUser } from '../types';
import { useColors } from '../theme/ThemeContext';
import { space, fontSize, fontWeight, radius, isDesktopWidth } from '../theme/tokens';
import { Button } from '../components/Button';
import { LoadingState } from '../components/States';

interface AccountScreenProps {
  /** The signed-in user, or null while auth state is still resolving. */
  user: AppUser | null;
  /** Invoked when the user taps Sign out. */
  onSignOut: () => void;
  /** True while the sign-out request is in flight. */
  signingOut?: boolean;
  /** A failed sign-out, already mapped to a readable message. */
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Derives up to two initials for the avatar fallback.
 *
 * Google accounts do not always expose a display name, and a photo URL is
 * optional, so the fallback has to cope with an empty or email-only identity.
 */
export function getInitials(displayName?: string | null, email?: string | null): string {
  const source = displayName?.trim() || email?.trim() || '';
  const parts = source
    .split(/[\s._@+-]+/)
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function AccountScreen({
  user,
  onSignOut,
  signingOut = false,
  error,
  style,
}: AccountScreenProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);
  const styles = getStyles(colors, isDesktop);

  // Null means the shell has not resolved auth state yet — not "signed out".
  // The shell renders SignInScreen for that case, so this is a safety net.
  if (!user) {
    return <LoadingState message="Loading your account…" style={styles.loading} />;
  }

  const name = user.displayName?.trim() || 'Signed in';
  const email = user.email?.trim();

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.heading}>Account</Text>

        <View style={styles.identity}>
          {user.photoURL ? (
            <Image
              source={{ uri: user.photoURL }}
              style={styles.avatar}
              accessibilityRole="image"
              accessibilityLabel={`${name}'s profile photo`}
            />
          ) : (
            <View
              style={styles.avatarFallback}
              accessibilityRole="image"
              accessibilityLabel="No profile photo"
            >
              <Text style={styles.avatarInitials}>{getInitials(user.displayName, user.email)}</Text>
            </View>
          )}

          <Text style={styles.name}>{name}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
        </View>

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            variant="secondary"
            label="Sign out"
            fullWidth
            onPress={onSignOut}
            loading={signingOut}
            disabled={signingOut}
            accessibilityLabel="Sign out"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function getStyles(colors: ReturnType<typeof useColors>, isDesktop: boolean) {
  // Keys are kept in alphabetical order to satisfy `react-native/sort-styles`.
  return StyleSheet.create({
    actions: {
      marginTop: space[8],
      width: '100%',
    },
    avatar: {
      borderRadius: 40,
      height: 80,
      width: 80,
    },
    avatarFallback: {
      alignItems: 'center',
      backgroundColor: colors.accentMuted,
      borderRadius: 40,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    avatarInitials: {
      color: colors.textPrimary,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
    },
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
    email: {
      color: colors.textSecondary,
      fontSize: fontSize.base,
      marginTop: space[1],
      textAlign: 'center',
    },
    error: {
      color: colors.danger,
      fontSize: fontSize.xs,
      marginTop: space[4],
      textAlign: 'center',
      width: '100%',
    },
    heading: {
      color: colors.textPrimary,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      marginBottom: space[6],
      textAlign: 'center',
    },
    identity: {
      alignItems: 'center',
      gap: space[2],
    },
    loading: {
      backgroundColor: colors.background,
      flex: 1,
    },
    name: {
      color: colors.textPrimary,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      marginTop: space[3],
      textAlign: 'center',
    },
    scroll: {
      backgroundColor: colors.background,
      flex: 1,
    },
  });
}
