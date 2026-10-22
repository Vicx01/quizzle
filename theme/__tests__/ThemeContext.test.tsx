/**
 * Quizzle — ThemeContext tests.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../ThemeContext';

function Harness() {
  useTheme();
  return null;
}

describe('ThemeContext', () => {
  it('provides theme context with default system mode', () => {
    const { unmount } = render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>
    );
    expect(() => unmount()).not.toThrow();
  });

  it('colors are available from context', () => {
    let capturedColors: any = null;
    function CapturingHarness() {
      const { colors } = useTheme();
      capturedColors = colors;
      return null;
    }
    render(
      <ThemeProvider>
        <CapturingHarness />
      </ThemeProvider>
    );
    expect(capturedColors).toBeTruthy();
    expect(capturedColors.background).toBeTruthy();
    expect(capturedColors.textPrimary).toBeTruthy();
    expect(capturedColors.accent).toBeTruthy();
  });
});
