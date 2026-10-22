/**
 * Input component — text input and textarea share the same styling.
 *
 * Label above input, border communicates state (no inner box-shadow).
 * Error state: border danger + helper text danger.
 * Styles computed from current theme colors via useMemo.
 */

import React, { useMemo } from 'react';
import {
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, radius, fontSize, fontWeight } from '../theme/tokens';

const fonts = { body: 'Inter' as const };

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: string;
  disabled?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  disabled = false,
  maxLength,
  style,
  containerStyle,
}: InputProps) => {
  const colors = useColors();

  const styles = useMemo(() => {
    const fw = fontWeight.medium as unknown as TextStyle['fontWeight'];
    return {
      container: { marginBottom: space[4] } as ViewStyle,
      label: {
        fontFamily: fonts.body,
        fontSize: fontSize.sm,
        fontWeight: fw,
        color: colors.textPrimary,
        marginBottom: space[1],
      } as TextStyle,
      input: {
        height: multiline ? undefined : 44,
        borderWidth: 1,
        borderColor: error ? colors.danger : colors.border,
        borderRadius: radius.small,
        paddingHorizontal: space[3],
        paddingVertical: multiline ? space[3] : undefined,
        fontFamily: fonts.body,
        fontSize: fontSize.base,
        color: colors.textPrimary,
        backgroundColor: disabled ? colors.accentMuted : colors.surface,
        minHeight: multiline ? 100 : undefined,
      } as TextStyle,
      errorText: {
        fontFamily: fonts.body,
        fontSize: fontSize.xs,
        color: colors.danger,
        marginTop: space[1],
        marginLeft: 2,
      } as TextStyle,
    };
  }, [colors, error, disabled, multiline])

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, style]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType as any}
        editable={!disabled}
        maxLength={maxLength}
        selectionColor={colors.accent}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
