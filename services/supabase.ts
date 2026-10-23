/**
 * Quizzle — Supabase configuration and client.
 *
 * SECURITY — which keys may appear in the client:
 *
 *   * `EXPO_PUBLIC_SUPABASE_URL`          — project URL. Public.
 *   * `EXPO_PUBLIC_SUPABASE_ANON_KEY`     — anon/publishable key. Public by
 *                                            design; it grants no access on
 *                                            its own. Data is protected by
 *                                            Row Level Security, which is
 *                                            enabled on every table.
 *
 *   NEVER place the service-role key, the database password, or an AI provider
 *   key in any `EXPO_PUBLIC_*` variable. Expo inlines every one of them into
 *   the client bundle where anyone can read them. The service-role key bypasses
 *   RLS entirely, so leaking it would defeat the entire data model.
 *   `getSupabaseConfigStatus()` actively checks for that mistake and refuses to
 *   report a healthy configuration if it finds one.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  looksLikePlaceholder,
  looksLikeServiceRoleKey,
  type ConfigProblem,
  type ConfigStatus,
} from './configStatus';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Lazily creates the Supabase client.
 *
 * AsyncStorage is used for session persistence so a signed-in user survives a
 * restart on native. On web supabase-js falls back to localStorage, which is
 * what we want there; AsyncStorage is simply unused on that platform.
 *
 * `detectSessionInUrl` is enabled because Supabase's OAuth flow returns to the
 * app with the session in the URL (PKCE code exchange). Without it the sign-in
 * would complete on Google's side but the app would never observe the session.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** True when the Supabase environment variables required for sign-in exist. */
export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigStatus().ok;
}

// ---------------------------------------------------------------------------
// Configuration diagnostics
// ---------------------------------------------------------------------------

export const REQUIRED_SUPABASE_ENV = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

/** True for `https://<ref>.supabase.co` and local `http://127.0.0.1:54321`. */
function isValidSupabaseUrl(value: string): boolean {
  if (/^https:\/\/[a-z0-9-]{20}\.supabase\.co$/i.test(value)) return true;
  // Local Supabase CLI / self-hosted.
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(value)) return true;
  // Custom domain pointing at a Supabase project.
  return /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
}

/**
 * Full configuration diagnostic for Supabase.
 *
 * Returns the same shape as the Firebase equivalent so the sign-in screen can
 * render one checklist regardless of which provider is active.
 */
export function getSupabaseConfigStatus(): ConfigStatus {
  const errors: ConfigProblem[] = [];
  const warnings: ConfigProblem[] = [];

  const rawUrl = supabaseUrl?.trim();
  const rawKey = supabaseAnonKey?.trim();

  if (!rawUrl) {
    errors.push({
      key: 'EXPO_PUBLIC_SUPABASE_URL',
      kind: 'missing',
      message: 'EXPO_PUBLIC_SUPABASE_URL is not set',
    });
  } else if (looksLikePlaceholder(rawUrl)) {
    errors.push({
      key: 'EXPO_PUBLIC_SUPABASE_URL',
      kind: 'placeholder',
      message: `EXPO_PUBLIC_SUPABASE_URL still has its placeholder value ("${rawUrl}")`,
    });
  } else if (!isValidSupabaseUrl(rawUrl)) {
    errors.push({
      key: 'EXPO_PUBLIC_SUPABASE_URL',
      kind: 'invalid',
      message: `EXPO_PUBLIC_SUPABASE_URL ("${rawUrl}") must look like https://<project-ref>.supabase.co`,
    });
  }

  if (!rawKey) {
    errors.push({
      key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      kind: 'missing',
      message: 'EXPO_PUBLIC_SUPABASE_ANON_KEY is not set',
    });
  } else if (looksLikePlaceholder(rawKey)) {
    errors.push({
      key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      kind: 'placeholder',
      message: `EXPO_PUBLIC_SUPABASE_ANON_KEY still has its placeholder value ("${rawKey}")`,
    });
  } else if (looksLikeServiceRoleKey(rawKey)) {
    // Blocking, and deliberately so: this key bypasses RLS. Shipping it to a
    // browser hands every user full access to every row.
    errors.push({
      key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      kind: 'unsafe',
      message:
        'EXPO_PUBLIC_SUPABASE_ANON_KEY contains a service-role key, not the anon key. ' +
        'The service-role key bypasses Row Level Security and must never be shipped to a client. ' +
        'Use the anon/publishable key instead.',
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}
