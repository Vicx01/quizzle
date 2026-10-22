/**
 * Segmented control — used for quiz type (MCQ/Theory/Mixed) and difficulty.
 * No wrapper cards; options are pressable buttons with accent ring when selected.
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
import { space, radius, fontSize, fontWeight } from '../theme/tokens';

interface SegmentedControlProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const SegmentedControl = ({
  label,
  options,
  value,
  onValueChange,
  style,
}: SegmentedControlProps) => {
  const colors = useColors();

  const styles = useMemo(() => {
    const fw = fontWeight.medium as unknown as TextStyle['fontWeight'];
    return {
      container: { marginBottom: space[4] } as ViewStyle,
      label: {
        color: colors.textPrimary,
        fontSize: fontSize.sm,
        fontWeight: fw,
      } as TextStyle,
      row: {
        flexDirection: 'row',
        gap: space[1],
        marginTop: space[1],
      } as ViewStyle,
      option: (selected: boolean) =>
        ({
          flex: 1,
          height: 40,
          borderRadius: radius.small,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          // Option boundary identifies the selectable control -> needs 3:1.
          borderColor: selected ? colors.accent : colors.borderControl,
          backgroundColor: selected ? 'rgba(15, 98, 254, 0.06)' : colors.surface,
        }) as ViewStyle,
      optionText: (selected: boolean) =>
        ({
          color: selected ? colors.accent : colors.textPrimary,
          fontSize: fontSize.sm,
          fontWeight: fw,
        }) as TextStyle,
    };
  }, [colors]);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map(opt => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              style={styles.option(selected)}
              onPress={() => onValueChange(opt.value)}
            >
              <Text style={styles.optionText(selected)}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
