/**
 * Quizzle — responsive layout hook.
 *
 * Provides breakpoint-based layout helpers for the balanced
 * web/mobile strategy. Mobile and desktop are treated as equal
 * priorities — no "mobile is secondary" assumptions.
 */

import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '../theme/tokens';

export function useResponsive() {
  const { width } = useWindowDimensions();

  const isMobile = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;

  return {
    width,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints: BREAKPOINTS,
  };
}

export function getContentPadding(isMobile: boolean, isDesktop: boolean) {
  if (isDesktop) {
    return 32; // space[8]
  }
  return 16; // space[4]
}

export function getMaxContentWidth(isDesktop: boolean) {
  return isDesktop ? 720 : undefined;
}
