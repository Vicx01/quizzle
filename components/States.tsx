/**
 * Quizzle — reusable state components.
 *
 * Loading, empty, error and offline states shared across screens.
 *
 * DESIGN_BRIEF §11 rules:
 *  - Loading: centred spinner + short text. No skeletons.
 *  - Error:   centred heading + description + primary action ("Try again").
 *             Critical errors use this inline/page state, never a toast.
 *  - Empty:   centred heading + subtitle + primary action. No illustration.
 *  - Offline: shown when connectivity is lost; states plainly that the action
 *             cannot be completed right now.
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, fontSize, fontWeight, radius } from '../theme/tokens';
import { Button } from './Button';

// ---------------------------------------------------------------- Loading

interface LoadingStateProps {
  /** Short label shown under the spinner. */
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({ message = 'Loading…', style }: LoadingStateProps) {
  const colors = useColors();
  return (
    <View style={[styles.centered, style]} accessibilityRole="progressbar">
      <ActivityIndicator size="small" color={colors.accent} />
      <Text style={[styles.body, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ Empty

interface EmptyStateProps {
  heading: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ heading, subtitle, actionLabel, onAction, style }: EmptyStateProps) {
  const colors = useColors();
  return (
    <View style={[styles.centered, style]}>
      <Text style={[styles.heading, { color: colors.textPrimary }]}>{heading}</Text>
      {subtitle ? (
        <Text style={[styles.body, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button variant="primary" label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ Error

interface ErrorStateProps {
  heading?: string;
  description: string;
  /** Supplying a retry action renders the "Try again" button. */
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  heading = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  style,
}: ErrorStateProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.centered,
        styles.errorPanel,
        { backgroundColor: colors.dangerMuted, borderColor: colors.danger },
        style,
      ]}
      accessibilityRole="alert"
    >
      <Text style={[styles.heading, { color: colors.danger }]}>{heading}</Text>
      <Text style={[styles.body, { color: colors.textPrimary }]}>{description}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button variant="secondary" label={retryLabel} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- Offline

interface OfflineStateProps {
  /** What cannot happen while offline, e.g. "Generating a quiz". */
  action?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function OfflineState({ action, onRetry, style }: OfflineStateProps) {
  const colors = useColors();
  const description = action
    ? `You're offline. ${action} needs an internet connection.`
    : "You're offline. Reconnect to continue.";

  return (
    <View
      style={[
        styles.centered,
        styles.offlinePanel,
        { backgroundColor: colors.warningMuted, borderColor: colors.warning },
        style,
      ]}
      accessibilityRole="alert"
    >
      <Text style={[styles.heading, { color: colors.warning }]}>No connection</Text>
      <Text style={[styles.body, { color: colors.textPrimary }]}>{description}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button variant="secondary" label="Retry" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

/** Compact inline banner variant, for use above content that stays visible. */
export function OfflineBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.warningMuted, borderColor: colors.warning },
        style,
      ]}
      accessibilityRole="alert"
    >
      <Text style={[styles.bannerText, { color: colors.warning }]}>
        You&apos;re offline. Changes will not be saved until you reconnect.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: space[2],
  },
  banner: {
    borderRadius: radius.small,
    borderWidth: 1,
    marginBottom: space[4],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  bannerText: {
    fontSize: fontSize.sm,
  },
  body: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
    gap: space[3],
    justifyContent: 'center',
    padding: space[6],
  },
  errorPanel: {
    borderRadius: radius.small,
    borderWidth: 1,
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  offlinePanel: {
    borderRadius: radius.small,
    borderWidth: 1,
  },
});
