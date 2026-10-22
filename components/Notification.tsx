/**
 * Notification / Toast component.
 *
 * Non-obstructive notification that auto-dismisses.
 * Positioned bottom-center on mobile, top-right on desktop.
 * Never used for critical errors requiring action — use inline error state instead.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, fontSize, radius, isDesktopWidth } from '../theme/tokens';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  visible: boolean;
  message: string;
  type?: NotificationType;
  /** Auto-dismiss delay in ms (4–6s per spec). */
  duration?: number;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Notification({
  visible,
  message,
  type = 'info',
  duration = 5000,
  onDismiss,
  style,
  testID,
}: NotificationProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);
  const anim = useRef(new Animated.Value(0)).current;

  const typeColors: Record<NotificationType, { bg: string; text: string }> = {
    success: { bg: colors.successMuted, text: colors.success },
    error: { bg: colors.dangerMuted, text: colors.danger },
    warning: { bg: colors.warningMuted, text: colors.warning },
    info: { bg: colors.surface, text: colors.textPrimary },
  };
  const tc = typeColors[type];
  const styles = getStyles(colors);

  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }

    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => onDismiss?.());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, anim, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="alert"
      style={[
        styles.container,
        isDesktop && styles.desktop,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [isDesktop ? 50 : 80, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      <TouchableWithoutFeedback
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <View style={[styles.card, { backgroundColor: tc.bg, borderColor: colors.border }]}>
          <Text style={[styles.text, { color: tc.text }]}>{message}</Text>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      borderRadius: radius.small,
      borderWidth: 1,
      elevation: 4,
      flexDirection: 'row',
      gap: space[3],
      maxWidth: 400,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    container: {
      alignItems: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      zIndex: 1000,
    },
    desktop: {
      alignItems: 'flex-end',
      left: undefined,
      right: space[8],
      top: space[6],
    },
    text: {
      flex: 1,
      fontSize: fontSize.sm,
    },
  });
}
