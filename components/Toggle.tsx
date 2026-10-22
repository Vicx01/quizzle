/**
 * Toggle switch — used for optional quiz timer.
 * 44 px touch target, accent color when on.
 */

import React, { useMemo } from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, fontSize, fontWeight } from '../theme/tokens';

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

export const Toggle = ({ label, value, onValueChange, style }: ToggleProps) => {
  const colors = useColors();

  const styles = useMemo(() => {
    const fw = fontWeight.medium as unknown as TextStyle['fontWeight'];
    return {
      container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: space[3],
        borderTopWidth: 1,
        borderTopColor: colors.border,
      } as ViewStyle,
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
      } as ViewStyle,
      label: {
        color: colors.textPrimary,
        fontSize: fontSize.base,
        fontWeight: fw,
      } as TextStyle,
      track: {
        width: 44,
        height: 24,
        borderRadius: 12,
        // Track must be discernible against the surface or the control is
        // invisible when off (was 1.18:1). borderControl gives 3.02:1.
        backgroundColor: value ? colors.accent : colors.borderControl,
      } as ViewStyle,
      thumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        left: value ? 22 : 2,
        top: 2,
      } as ViewStyle,
    };
  }, [colors, value]);

  return (
    <Pressable style={[styles.container, style]} onPress={() => onValueChange(!value)}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.track}>
          <View style={styles.thumb} />
        </View>
      </View>
    </Pressable>
  );
};
