/**
 * Button component.
 *
 * Variants: primary, secondary, danger, ghost.
 * 44 px touch-friendly height, subtle 6 px radius, focus ring.
 * No gradients, no glass, no heavy shadows (anti-pattern).
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, radius, fontSize, fontWeight } from '../theme/tokens';

const fonts = { body: 'Inter' as const };

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({
  variant = 'primary',
  label,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  ...props
}: ButtonProps) => {
  const colors = useColors();

  const baseStyles: StyleProp<ViewStyle>[] = [
    styles.container,
    fullWidth && styles.fullWidth,
    {
      height: 44,
      borderRadius: radius.small,
      justifyContent: 'center',
      alignItems: 'center',
    },
    style,
  ];

  let variantStyles: ViewStyle[] = [];
  let textColor: string;

  if (disabled) {
    variantStyles = [{ backgroundColor: colors.accentMuted }, { borderColor: colors.border }];
    // Disabled controls are exempt from WCAG 1.4.3, so this uses the
    // dedicated faded token rather than the readable textTertiary.
    textColor = colors.textDisabled;
  } else if (variant === 'primary') {
    variantStyles = [{ backgroundColor: colors.accent }];
    textColor = '#FFFFFF';
  } else if (variant === 'secondary') {
    variantStyles = [
      { backgroundColor: 'transparent' },
      // Secondary button border identifies the control -> needs 3:1.
      { borderWidth: 1, borderColor: colors.borderControl },
    ];
    textColor = colors.textPrimary;
  } else if (variant === 'danger') {
    variantStyles = [{ backgroundColor: colors.danger }];
    textColor = '#FFFFFF';
  } else {
    // ghost
    variantStyles = [{ backgroundColor: 'transparent' }];
    textColor = colors.textSecondary;
  }

  return (
    <Pressable disabled={disabled || loading} style={[baseStyles, variantStyles]} {...props}>
      <View style={styles.row}>
        {loading && (
          <View
            style={[
              styles.spinner,
              { borderColor: colors.spinnerTrack, borderTopColor: colors.spinnerHead },
            ]}
          />
        )}
        <Text style={[styles.text, { color: textColor }]}>{loading ? '…' : label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    paddingHorizontal: space[4],
  },
  fullWidth: {
    width: '100%',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[2],
    justifyContent: 'center',
  },
  // Colours are applied inline from tokens (see `colors.spinnerTrack` /
  // `colors.spinnerHead`) so the literal values live only in the theme.
  spinner: {
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
