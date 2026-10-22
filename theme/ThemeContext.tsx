/**
 * Theme context — provides light/dark/system theme selection.
 *
 * Theme controls live in Account/Settings (owner condition 4).
 * Default: system preference on first visit.
 *
 * Persistence uses the cross-platform storage adapter (AsyncStorage), NOT
 * `localStorage`, so the same code runs on web and native.
 *
 * IMPORTANT: `useTheme()` throws outside a ThemeProvider. Components must be
 * rendered inside <ThemeProvider>; test harnesses must wrap children in it
 * (calling useTheme/useColors in the harness body itself will throw).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';
import type { ColorSchemeName } from 'react-native';
import type { ColorTokens } from './tokens';
import { lightColors, darkColors } from './tokens';
import { getItem, setItem, STORAGE_KEYS } from '../services/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: ThemeMode;
  colorScheme: ColorSchemeName;
  colors: ColorTokens;
  setTheme: (mode: ThemeMode) => void;
  /** True until the stored preference has been read back. */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);
  // Appearance.getColorScheme() can return null on some platforms.
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null>(() =>
    Appearance.getColorScheme()
  );

  // Track OS-level appearance changes while mode === 'system'.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? null);
    });
    return () => sub.remove();
  }, []);

  // Restore the saved preference once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getItem(STORAGE_KEYS.theme);
      if (!cancelled) {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setMode(stored);
        }
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change (skip the initial default so an unread value cannot
  // overwrite a stored preference with 'system').
  useEffect(() => {
    if (!ready) return;
    void setItem(STORAGE_KEYS.theme, mode);
  }, [mode, ready]);

  const colorScheme: ColorSchemeName = mode === 'system' ? (systemScheme ?? 'light') : mode;

  const colors: ColorTokens = (colorScheme === 'dark' ? darkColors : lightColors) as ColorTokens;

  const setTheme = useCallback((next: ThemeMode) => setMode(next), []);

  const value = useMemo<ThemeContextType>(
    () => ({ theme: mode, colorScheme, colors, setTheme, ready }),
    [mode, colorScheme, colors, setTheme, ready]
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
