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
    variantStyles = [
      { backgroundColor: colors.accentMuted },
      { borderColor: colors.border },
    ];
    textColor = colors.textTertiary;
  } else if (variant === 'primary') {
    variantStyles = [{ backgroundColor: colors.accent }];
    textColor = '#FFFFFF';
  } else if (variant === 'secondary') {
    variantStyles = [
      { backgroundColor: 'transparent' },
      { borderWidth: 1, borderColor: colors.border },
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
    <Pressable
      disabled={disabled || loading}
      style={[baseStyles, variantStyles]}
      {...props}
    >
      <View style={styles.row}>
        {loading && <View style={styles.spinner} />}
        <Text style={[styles.text, { color: textColor }]}>
          {loading ? '…' : label}
        </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
  },
});
