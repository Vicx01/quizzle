/**
 * Quizzle design tokens.
 *
 * Implements the approved design system from DESIGN_BRIEF.md.
 * Colors are semantic (role-based) so light/dark themes swap the same token set.
 * WCAG AA contrast must be verified before finalising (owner condition 1).
 */

// Breakpoints (balanced strategy — mobile and desktop equal)
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * Breakpoint helpers.
 * Deliberately NOT computed at module load — `Dimensions.get('window')` at import
 * time touches the native bridge, which is unavailable in Jest/jsdom and breaks
 * server-side/first-render assumptions. Use `useResponsive()` in components so the
 * value is reactive to window changes.
 */
export function isDesktopWidth(width: number): boolean {
  return width >= BREAKPOINTS.desktop;
}

export function isTabletWidth(width: number): boolean {
  return width >= BREAKPOINTS.tablet;
}

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

/**
 * Theme colours.
 *
 * Two distinct border tokens, because WCAG 1.4.11 applies only to boundaries
 * that are *necessary to identify a UI component* — not to decorative dividers:
 *
 *  - `border`        Decorative separators (dividers, card outlines, progress
 *                    tracks). Kept deliberately subtle. NOT required to hit 3:1.
 *  - `borderControl` Boundaries that identify an interactive control (text
 *                    inputs, secondary buttons, segmented options, toggle
 *                    tracks). Required to hit >= 3:1 against every surface it
 *                    is drawn on.
 *
 * Two distinct muted-text tokens, because WCAG 1.4.3 exempts *disabled*
 * controls but NOT placeholder text:
 *
 *  - `textTertiary`  Readable muted text (placeholders, captions). >= 4.5:1.
 *  - `textDisabled`  Disabled-control labels only. Exempt from 1.4.3; kept
 *                    visually faded by design.
 *
 * All values are asserted by theme/__tests__/contrast.test.ts.
 */

// Light theme colors
export const lightColors = {
  background: '#FFFFFF',
  surface: '#F7F7F7',
  border: '#E5E5E5',
  // 3.02:1 on surface, 3.23:1 on background
  borderControl: '#8F8F8F',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  // 4.62:1 on surface, 4.95:1 on background
  textTertiary: '#707070',
  // Disabled controls only — exempt from WCAG 1.4.3
  textDisabled: '#999999',
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
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',
  spinnerTrack: 'rgba(255, 255, 255, 0.3)',
  spinnerHead: '#FFFFFF',
} as const;

// Dark theme colors
export const darkColors = {
  background: '#0F0F0F',
  surface: '#1A1A1A',
  border: '#2A2A2A',
  // 3.03:1 on surface, 3.34:1 on background
  borderControl: '#666666',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  // 5.04:1 on surface, 5.55:1 on background
  textTertiary: '#8A8A8A',
  // Disabled controls only — exempt from WCAG 1.4.3
  textDisabled: '#525252',
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
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',
  spinnerTrack: 'rgba(255, 255, 255, 0.3)',
  spinnerHead: '#FFFFFF',
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
