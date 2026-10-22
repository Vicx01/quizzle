/**
 * Dialog / Modal component.
 *
 * Overlay with a centered panel. Used for confirmations and small forms.
 * No full-page modal takeovers for small actions (anti-pattern).
 *
 * Behaviour: closes on backdrop press, on the Android hardware back button,
 * and (on web) is expected to be paired with an Escape-key handler by the caller.
 */

import React, { useCallback, useEffect } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useColors } from '../theme/ThemeContext';
import { space, radius, fontSize, fontWeight, isDesktopWidth } from '../theme/tokens';

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Dialog({ visible, onClose, title, children, actions, style, testID }: DialogProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);
  const styles = getStyles(colors);

  const handleBack = useCallback(() => {
    onClose();
    return true;
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [visible, handleBack]);

  // Early return MUST come after all hooks so hook order stays stable
  // across visible=true -> false -> true transitions.
  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={onClose} accessible={false}>
      <View testID={testID} style={[styles.overlay, isDesktop && styles.desktopOverlay, style]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoiding}
        >
          <View
            accessibilityRole="none"
            style={[styles.panel, isDesktop && { maxWidth: Math.min(520, width * 0.8) }]}
          >
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {children}
            {actions ? <View style={styles.actions}>{actions}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    actions: {
      flexDirection: 'row',
      gap: space[3],
      justifyContent: 'flex-end',
      marginTop: space[6],
    },
    desktopOverlay: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyboardAvoiding: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    overlay: {
      alignItems: 'center',
      backgroundColor: colors.overlay,
      flex: 1,
      justifyContent: 'center',
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.medium,
      borderWidth: 1,
      elevation: 4,
      maxWidth: 520,
      padding: space[6],
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      width: '90%',
    },
    title: {
      color: colors.textPrimary,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      marginBottom: space[4],
    },
  });
}
