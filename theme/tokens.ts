/**
 * Quizzle design tokens.
 *
 * Implements the approved design system from DESIGN_BRIEF.md.
 * Colors are semantic (role-based) so light/dark themes swap the same token set.
 * WCAG AA contrast must be verified before finalising (owner condition 1).
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Breakpoints (balanced strategy — mobile and desktop equal)
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

export const isDesktop = SCREEN_WIDTH >= BREAKPOINTS.desktop;
export const isTablet = SCREEN_WIDTH >= BREAKPOINTS.tablet;

// Max content width: 720 px on desktop, full width with padding on mobile
export const MAX_CONTENT_WIDTH = 720;

// Spacing scale (4 px base, multiples of 4 px)
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export type SpaceKey = keyof typeof space;

// Border radius
export const radius = {
  small: 6,
  medium: 8,
  large: 12,
} as const;

// Light theme colors
export const lightColors = {
  background: '#FFFFFF',
  surface: '#F7F7F7',
  border: '#E5E5E5',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  accent: '#0F62FE',
  accentHover: '#0D55E8',
  accentMuted: '#C7C7C7',
  success: '#16A34A',
  successMuted: '#ECFDF3',
  danger: '#DC2626',
  dangerMuted: '#FEF2F2',
  warning: '#D97706',
  warningMuted: '#FFFBEB',
  focus: '#0F62FE',
} as const;

// Dark theme colors
export const darkColors = {
  background: '#0F0F0F',
  surface: '#1A1A1A',
  border: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textTertiary: '#525252',
  accent: '#3B82F6',
  accentHover: '#2563EB',
  accentMuted: '#4B4B4B',
  success: '#22C55E',
  successMuted: '#064E2B',
  danger: '#EF4444',
  dangerMuted: '#450A0A',
  warning: '#F59E0B',
  warningMuted: '#452A03',
  focus: '#3B82F6',
} as const;

export type ThemeName = 'light' | 'dark';
export type ColorTokens = typeof lightColors;

export type ThemeTokens = {
  colors: ColorTokens;
  space: typeof space;
  radius: typeof radius;
  breakpoints: typeof BREAKPOINTS;
  maxContentWidth: typeof MAX_CONTENT_WIDTH;
};

// Typography (font families; sizes applied per component)
export const fonts = {
  heading: 'Inter',
  body: 'Inter',
  mono: 'JetBrains Mono',
} as const;

// Font sizes (px)
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 40, // logo/display
} as const;

// Font weights (React Native TextStyle compatible)
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
} as const;

// Line heights
export const lineHeight = {
  tight: 1.2,
  normal: 1.3,
  relaxed: 1.5,
} as const;
