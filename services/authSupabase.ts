/**
 * Quizzle — Supabase authentication (Google only).
 *
 * This module holds the Supabase-specific mechanics: mapping a Supabase user
 * onto the app's `AppUser`, starting the Google OAuth flow, and cleaning the
 * OAuth artefacts out of the URL afterwards. `services/auth.ts` is the public
 * surface the rest of the app imports.
 *
 * Nothing here contacts the network at import time, so it is safe to import in
 * tests and in an app that has not been configured yet.
 */

import type { Session, User } from '@supabase/supabase-js';
import type { AppUser } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

/** Maps a Supabase user onto the provider-neutral shape the UI consumes. */
export function toAppUser(user: User | null): AppUser | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstString = (...values: unknown[]): string | null => {
    for (const v of values) {
      if (typeof v === 'string' && v.trim()) return v;
    }
    return null;
  };

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: firstString(meta.full_name, meta.name, meta.preferred_username),
    photoURL: firstString(meta.avatar_url, meta.picture),
  };
}

/**
 * Subscribes to Supabase auth changes.
 *
 * Supabase emits `INITIAL_SESSION` on subscribe, which is how a returning user
 * is picked up without an explicit "get session" call.
 */
export function onSupabaseAuthStateChanged(callback: (user: AppUser | null) => void): () => void {
  if (!isSupabaseConfigured()) return () => {};

  const { data } = getSupabaseClient().auth.onAuthStateChange(
    (_event: string, session: Session | null) => {
      callback(toAppUser(session?.user ?? null));
    }
  );
  return () => data.subscription.unsubscribe();
}

/**
 * Returns the current session's user, or null.
 *
 * Async because Supabase reads persisted storage, which is async on native.
 */
export async function getSupabaseUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) return null;
  return toAppUser(data.session?.user ?? null);
}

/**
 * Starts the Google OAuth flow.
 *
 * Uses Supabase's redirect flow: the browser navigates to Google and returns to
 * `redirectTo`, where the client exchanges the PKCE code for a session.
 * `detectSessionInUrl` is enabled on the client so that exchange happens
 * automatically on load.
 *
 * Resolves to false when the redirect was started (the page is navigating
 * away), and true when a session already exists. It throws on real failures so
 * the caller can map the error to an actionable message.
 */
export async function signInWithGoogleSupabase(): Promise<boolean> {
  const redirectTo =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined;

  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Forces account selection so a user already signed into Google can
      // still choose which account to use.
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) throw error;
  return true;
}

/** Signs out of Supabase, clearing the persisted session. */
export async function signOutSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

/**
 * Cleans OAuth artefacts out of the URL after a redirect sign-in.
 *
 * Supabase leaves `?code=…` or `#access_token=…` in the address bar. Removing
 * them keeps the URL shareable and stops the code being re-read on refresh.
 */
export function cleanUpSupabaseUrl(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('code') || url.searchParams.has('error') || url.hash.length > 1) {
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');
    url.hash = '';
    window.history.replaceState({}, document.title, url.toString());
  }
}
