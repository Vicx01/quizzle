/**
 * Theme context — provides light/dark/system theme selection.
 *
 * Theme controls live in Account/Settings (owner condition 4).
 * Default: system preference on first visit.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { lightColors, darkColors, ColorTokens } from './tokens';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: ThemeMode;
  colorScheme: ColorSchemeName;
  colors: ColorTokens;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const systemScheme = Appearance.getColorScheme();

  // Resolve actual color scheme: system follows OS, otherwise use mode directly
  const colorScheme: ColorSchemeName =
    mode === 'system' ? (systemScheme ?? 'light') : mode;

  const colors: ColorTokens = (colorScheme === 'dark'
    ? darkColors
    : lightColors) as ColorTokens;

  // Persist theme choice; on first read, respect system preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem('quizzle:theme');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setMode(stored);
      }
    } catch {
      // localStorage unavailable (e.g. SSR) — keep system default
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('quizzle:theme', mode);
    } catch {
      // ignore
    }
  }, [mode]);

  const value = useMemo<ThemeContextType>(
    () => ({ theme: mode, colorScheme, colors, setTheme: setMode }),
    [mode, colorScheme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export function useColors() {
  return useTheme().colors;
}
