/**
 * Quizzle — Authentication service.
 *
 * Quizzle signs in with Google only — no email/password and no other provider.
 * Supabase Auth is the sole authentication provider; Firebase Auth has been
 * removed.
 *
 * Screens consume the provider-neutral `AppUser` rather than Supabase's own
 * `User`, so the UI has no compile-time dependency on the auth vendor and the
 * shape of a signed-in identity is defined once, in `types/index.ts`.
 *
 * Nothing here contacts the network at import time, so this module is safe to
 * import in tests and before the app has been configured.
 */

import type { AppUser } from '../types';
import { getSupabaseConfigStatus } from './supabase';
import type { ConfigStatus } from './configStatus';
import {
  cleanUpSupabaseUrl,
  getSupabaseUser,
  onSupabaseAuthStateChanged,
  signInWithGoogleSupabase,
  signOutSupabase,
} from './authSupabase';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * True when sign-in has the configuration it needs.
 *
 * The sign-in screen uses this to choose between a working button and a setup
 * checklist. It must never render a button that cannot work: a misconfigured
 * deploy has to explain itself rather than failing silently.
 */
export function isAuthConfigured(): boolean {
  return getAuthConfigStatus().ok;
}

/** Configuration diagnostic for Supabase Auth. */
export function getAuthConfigStatus(): ConfigStatus {
  return getSupabaseConfigStatus();
}

/** Best-effort current origin, for "add this domain" instructions. Web only. */
function currentOrigin(): string | null {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return null;
}

/**
 * Public accessor for the current origin.
 *
 * Surfaced in the UI because embedded previews hide the address bar, leaving no
 * other way to read the value that must be allowlisted by the provider.
 */
export function getCurrentOrigin(): string | null {
  return currentOrigin();
}

/**
 * True when the app is running inside a frame (an embedded preview).
 *
 * Google refuses to render its consent pages inside a frame, so the OAuth flow
 * cannot complete there. The UI warns the user to open a real tab instead.
 */
export function isEmbeddedInFrame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // Reading window.top throws when framed cross-origin — being unable to
    // inspect the parent means we are certainly framed.
    return true;
  }
}

// ---------------------------------------------------------------------------
// Session observation
// ---------------------------------------------------------------------------

/**
 * Subscribes to auth changes. Returns an unsubscribe function.
 *
 * Supabase emits `INITIAL_SESSION` on subscribe, which is how a returning user
 * is picked up on load without an explicit "get session" call.
 */
export function onAuthStateChanged(callback: (user: AppUser | null) => void): () => void {
  return onSupabaseAuthStateChanged(callback);
}

/**
 * The currently signed-in user, or null.
 *
 * Async because Supabase reads persisted storage, which is asynchronous on
 * native.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  return getSupabaseUser();
}

/**
 * Cleans OAuth artefacts out of the URL after a redirect sign-in.
 *
 * The client is created with `detectSessionInUrl`, so the PKCE code exchange
 * has already happened by the time this runs. What remains is to strip the
 * `code` / `error` parameters and the hash from the address bar, so the URL is
 * shareable and the code cannot be replayed on refresh.
 *
 * Safe to call unconditionally: it does nothing when there is nothing to clean.
 */
export async function consumeRedirectResult(): Promise<AppUser | null> {
  cleanUpSupabaseUrl();
  return null;
}

// ---------------------------------------------------------------------------
// Sign in / out
// ---------------------------------------------------------------------------

/**
 * Starts Google sign-in.
 *
 * Always the redirect (OAuth) flow: the browser navigates to Google and returns
 * to this origin, where the client exchanges the PKCE code for a session.
 *
 * Resolves to null because the page is navigating away — the resulting session
 * arrives through `onAuthStateChanged`.
 */
export async function signInWithGoogle(): Promise<AppUser | null> {
  await signInWithGoogleSupabase();
  return null;
}

/** Signs out, clearing the persisted session. */
export async function signOut(): Promise<void> {
  await signOutSupabase();
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

/**
 * Maps an auth error to a message the user can act on.
 *
 * `validation_failed` / `bad_oauth_callback` are called out because they are the
 * likely failures on a preview host: Supabase rejects any callback URL that is
 * not on its redirect allow-list.
 */
export function describeAuthError(error: unknown): string {
  const err = error as {
    code?: string;
    message?: string;
    status?: number;
    name?: string;
  } | null;
  const code = err?.code ?? err?.name ?? '';
  const origin = currentOrigin();

  switch (code) {
    case 'validation_failed':
    case 'bad_oauth_callback':
    case 'request_timeout':
      return origin
        ? `Sign-in was rejected for this origin (${origin}). In the Supabase dashboard go to Authentication → URL Configuration and add it to the Redirect URLs list.`
        : 'Sign-in was rejected for this origin. Add it under Authentication → URL Configuration → Redirect URLs in the Supabase dashboard.';

    case 'provider_disabled':
    case 'oauth_provider_not_supported':
      return 'The Google provider is not enabled. Turn it on in the Supabase dashboard under Authentication → Providers → Google.';

    case 'invalid_credentials':
    case 'bad_oauth_state':
      return 'The sign-in link expired or was opened out of order. Start the sign-in again.';

    case 'popup_blocked':
      return 'The sign-in popup was blocked by your browser. Allow popups for this site and try again.';

    case 'access_denied':
    case 'user_cancelled':
      return 'Sign-in was cancelled.';

    case 'signup_disabled':
      return 'New sign-ups are disabled for this project. Enable them in the Supabase dashboard, or contact the project owner.';

    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many sign-in attempts. Wait a moment and try again.';

    case 'network_error':
      return 'Network error while contacting Supabase. Check your connection and try again.';

    default: {
      const message = err?.message;
      if (message) return `Sign-in failed: ${message}`;
      return 'Sign-in failed. Please try again.';
    }
  }
}

/** True when the user cancelled rather than hitting a real failure. */
export function isCancellation(error: unknown): boolean {
  const e = error as { code?: string; name?: string } | null;
  const code = e?.code ?? e?.name ?? '';
  return code === 'access_denied' || code === 'user_cancelled';
}

/**
 * `describeAuthError` plus the raw error code.
 *
 * The code is shown because some failures (notably a Google 403 raised before
 * the provider returns a typed error) are far easier to diagnose with the exact
 * identifier than with the prose message alone.
 */
export function describeAuthErrorWithCode(error: unknown): string {
  const message = describeAuthError(error);

  // Supabase reports failures through either `code` or `name`. A plain
  // `new Error(...)` has name "Error", which is noise rather than a diagnostic,
  // so it is excluded.
  const e = error as { code?: string; name?: string } | null;
  const name = e?.name && e.name !== 'Error' ? e.name : '';
  const code = e?.code || name || '';

  return code ? `${message}\n\nError code: ${code}` : message;
}
