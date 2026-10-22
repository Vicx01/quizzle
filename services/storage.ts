/**
 * Quizzle — cross-platform persistent storage.
 *
 * Wraps AsyncStorage, which is the only key/value store that works on BOTH
 * web and native in React Native. `localStorage` is web-only and throws on
 * iOS/Android, so it must never be referenced directly from shared code.
 *
 * AsyncStorage is async on every platform; the API here is always Promise-based
 * so callers behave identically on web and native.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'quizzle:';

function key(name: string): string {
  return PREFIX + name;
}

export async function getItem(name: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key(name));
  } catch {
    // Storage unavailable (private mode, quota, SSR) — degrade gracefully
    // rather than crashing the app.
    return null;
  }
}

export async function setItem(name: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(name), value);
  } catch {
    // Ignore write failures; persistence is a nicety, not a requirement.
  }
}

export async function removeItem(name: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(name));
  } catch {
    // Ignore.
  }
}

/** Storage keys used by the app. */
export const STORAGE_KEYS = {
  theme: 'theme',
} as const;
