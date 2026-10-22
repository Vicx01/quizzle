/**
 * Quizzle — Progress indicator component.
 *
 * Step counter and optional progress bar.
 * Placed above content, below the header.
 * Subtle, never animated aggressively.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, fontSize } from '../theme/tokens';

interface ProgressProps {
  current: number;
  total: number;
  showBar?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function Progress({ current, total, showBar = false, label, style }: ProgressProps) {
  const colors = useColors();
  const progress = total > 0 ? current / total : 0;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
        <Text style={[styles.counter, { color: colors.textSecondary }]}>
          {current} / {total}
        </Text>
      </View>
      {showBar && (
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[styles.fill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: space[4],
  },
  counter: {
    fontSize: fontSize.sm,
  } as TextStyle,
  fill: {
    borderRadius: 2,
    height: 4,
  },
  label: {
    fontSize: fontSize.sm,
  } as TextStyle,
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    borderRadius: 2,
    height: 4,
    marginTop: space[2],
    overflow: 'hidden',
  },
});
