/**
 * Quizzle — useResponsive hook tests.
 */

import { getContentPadding, getMaxContentWidth } from '../useResponsive';
import { BREAKPOINTS } from '../../theme/tokens';

describe('useResponsive', () => {
  it('returns breakpoint constants', () => {
    expect(BREAKPOINTS.mobile).toBe(0);
    expect(BREAKPOINTS.tablet).toBe(768);
    expect(BREAKPOINTS.desktop).toBe(1024);
  });

  it('getContentPadding returns correct values', () => {
    expect(getContentPadding(true, false)).toBe(16); // mobile
    expect(getContentPadding(false, true)).toBe(32); // desktop
  });

  it('getMaxContentWidth returns correct values', () => {
    expect(getMaxContentWidth(false)).toBeUndefined(); // mobile
    expect(getMaxContentWidth(true)).toBe(720); // desktop
  });
});
