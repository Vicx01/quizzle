/**
 * Tab bar — order: Generate, History, Share, Account (owner condition 2).
 * Bottom on mobile, top on desktop. Active tab uses accent color.
 */

import React, { useMemo } from 'react';
import {
  Pressable,
  Text,
  View,
  Dimensions,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, fontSize, fontWeight } from '../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

const tabs = [
  { key: 'generate', label: 'Generate' },
  { key: 'history', label: 'History' },
  { key: 'share', label: 'Share' },
  { key: 'account', label: 'Account' },
] as const;

interface TabBarProps {
  activeTab: string;
  onTabChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const TabBar = ({
  activeTab,
  onTabChange,
  style,
}: TabBarProps) => {
  const colors = useColors();

  const styles = useMemo(() => {
    const fw = fontWeight.medium as unknown as TextStyle['fontWeight'];
    const fn = fontWeight.normal as unknown as TextStyle['fontWeight'];
    return {
      container: {
        width: '100%',
        backgroundColor: colors.surface,
        borderTopWidth: IS_MOBILE ? 1 : 0,
        borderTopColor: colors.border,
        paddingHorizontal: space[4],
      } as ViewStyle,
      bar: {
        flexDirection: 'row',
        justifyContent: IS_MOBILE ? 'space-around' : 'flex-start',
        gap: space[2],
        paddingVertical: IS_MOBILE ? space[2] : space[3],
        borderBottomWidth: IS_MOBILE ? 0 : 1,
        borderBottomColor: colors.border,
      } as ViewStyle,
      tab: (active: boolean) => ({
        paddingVertical: IS_MOBILE ? 6 : 8,
        paddingHorizontal: IS_MOBILE ? 10 : 14,
        borderRadius: radiusMd(),
        borderWidth: active ? 1 : 0,
        borderColor: active ? colors.accent : 'transparent',
        backgroundColor: active
          ? 'rgba(15, 98, 254, 0.06)'
          : 'transparent',
      }) as ViewStyle,
      tabText: (active: boolean) => ({
        color: active ? colors.accent : colors.textSecondary,
        fontSize: fontSize.sm,
        fontWeight: active ? fw : fn,
      } as TextStyle),
    };
  }, [colors, IS_MOBILE])

  return (
    <View style={[styles.container, style]}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab(active)}
              onPress={() => onTabChange(tab.key)}
            >
              <Text style={styles.tabText(active)}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

function radiusMd() {
  return 6;
}
