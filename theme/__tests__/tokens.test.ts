/**
 * Quizzle — design tokens tests.
 */

import {
  lightColors,
  darkColors,
  space,
  radius,
  fontSize,
  BREAKPOINTS,
  MAX_CONTENT_WIDTH,
} from '../tokens';

describe('Design tokens', () => {
  it('light colors have all required tokens', () => {
    expect(lightColors.background).toBe('#FFFFFF');
    expect(lightColors.surface).toBe('#F7F7F7');
    expect(lightColors.border).toBe('#E5E5E5');
    expect(lightColors.textPrimary).toBe('#1A1A1A');
    expect(lightColors.textSecondary).toBe('#666666');
    expect(lightColors.accent).toBe('#0F62FE');
    expect(lightColors.success).toBe('#16A34A');
    expect(lightColors.danger).toBe('#DC2626');
    expect(lightColors.warning).toBe('#D97706');
    expect(lightColors.focus).toBe('#0F62FE');
  });

  it('dark colors have all required tokens', () => {
    expect(darkColors.background).toBe('#0F0F0F');
    expect(darkColors.surface).toBe('#1A1A1A');
    expect(darkColors.border).toBe('#2A2A2A');
    expect(darkColors.textPrimary).toBe('#FFFFFF');
    expect(darkColors.textSecondary).toBe('#A1A1AA');
    expect(darkColors.accent).toBe('#3B82F6');
    expect(darkColors.success).toBe('#22C55E');
    expect(darkColors.danger).toBe('#EF4444');
    expect(darkColors.warning).toBe('#F59E0B');
    expect(darkColors.focus).toBe('#3B82F6');
  });

  it('spacing scale uses multiples of 4', () => {
    expect(space[1]).toBe(4);
    expect(space[2]).toBe(8);
    expect(space[3]).toBe(12);
    expect(space[4]).toBe(16);
    expect(space[6]).toBe(24);
    expect(space[8]).toBe(32);
    expect(space[12]).toBe(48);
  });

  it('radius values are defined', () => {
    expect(radius.small).toBe(6);
    expect(radius.medium).toBe(8);
    expect(radius.large).toBe(12);
  });

  it('font sizes are defined', () => {
    expect(fontSize.xs).toBe(12);
    expect(fontSize.sm).toBe(14);
    expect(fontSize.base).toBe(16);
    expect(fontSize.lg).toBe(18);
    expect(fontSize.xl).toBe(20);
    expect(fontSize['2xl']).toBe(24);
    expect(fontSize['3xl']).toBe(40);
  });

  it('breakpoints are defined', () => {
    expect(BREAKPOINTS.mobile).toBe(0);
    expect(BREAKPOINTS.tablet).toBe(768);
    expect(BREAKPOINTS.desktop).toBe(1024);
  });

  it('max content width is 720', () => {
    expect(MAX_CONTENT_WIDTH).toBe(720);
  });
});
