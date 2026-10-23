/**
 * Quizzle — Authentication service (provider dispatcher).
 *
 * Quizzle signs in with Google only — no email/password, no other providers.
 *
 * During the Firebase -> Supabase migration this module dispatches to whichever
 * provider is active. The provider is chosen by `EXPO_PUBLIC_AUTH_PROVIDER`:
 *
 *   * unset or `firebase`  -> Firebase (the current, owner-verified login)
 *   * `supabase`           -> Supabase Auth
 *
 * Firebase remains the DEFAULT until Supabase sign-in has been verified by the
 * owner. That ordering matters: the app must never be left with a login that
 * has not been proven to work, and it must never have both providers live in
 * production at once. The switch is a single env var and Firebase is deleted in
 * the final phase.
 *
 * Every screen consumes the provider-neutral `AppUser`, not Firebase's or
 * Supabase's user type.
 */

import type { User } from 'firebase/auth';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut,
} from 'firebase/auth';
import type { AppUser, AuthProvider } from '../types';
import { getFirebaseAuth, getFirebaseConfigStatus } from './firebase';
import type { ConfigStatus } from './configStatus';
import { getSupabaseConfigStatus } from './supabase';
import {
  cleanUpSupabaseUrl,
  getSupabaseUser,
  onSupabaseAuthStateChanged,
  signInWithGoogleSupabase,
  signOutSupabase,
} from './authSupabase';

// Re-export for convenience
export { getFirebaseAuth };

// ---------------------------------------------------------------------------
// Provider selection
// ---------------------------------------------------------------------------

/**
 * Which backend is serving sign-in.
 *
 * Read from an env var rather than hard-coded so the owner can try Supabase on
 * one machine without shipping it to everyone. Anything other than the exact
 * string `supabase` falls back to Firebase, which keeps the default safe.
 */
export function getAuthProvider(): AuthProvider {
  return process.env.EXPO_PUBLIC_AUTH_PROVIDER === 'supabase' ? 'supabase' : 'firebase';
}

/**
 * True when the ACTIVE provider has the configuration it needs.
 *
 * The sign-in screen uses this to decide between showing a working button and
 * showing a setup checklist — it must never render a button that cannot work.
 */
export function isAuthConfigured(): boolean {
  return getAuthConfigStatus().ok;
}

/** Configuration diagnostic for the active provider. */
export function getAuthConfigStatus(): ConfigStatus {
  return getAuthProvider() === 'supabase' ? getSupabaseConfigStatus() : getFirebaseConfigStatus();
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
 * Google refuses to render its consent pages inside a frame, and browsers
 * typically block popups there, so the popup sign-in flow cannot complete. The
 * UI warns the user to open the app in a real tab instead.
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

function toAppUserFromFirebase(user: User | null): AppUser | null {
  if (!user) return null;
  return {
    id: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    provider: 'firebase',
  };
}

export function onAuthStateChanged(callback: (user: AppUser | null) => void): () => void {
  if (getAuthProvider() === 'supabase') {
    return onSupabaseAuthStateChanged(callback);
  }
  const auth = getFirebaseAuth();
  return fbOnAuthStateChanged(auth, user => callback(toAppUserFromFirebase(user)));
}

/** The current user according to the active provider. Async: Supabase reads
 *  persisted storage, which is asynchronous on native. */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (getAuthProvider() === 'supabase') return getSupabaseUser();
  return toAppUserFromFirebase(getFirebaseAuth().currentUser);
}

/**
 * Completes a redirect-based sign-in after the browser returns to the app.
 *
 * Firebase: must be called ONCE on startup, not after `signInWithRedirect` — by
 * the time the redirect completes the original page has been torn down.
 *
 * Supabase: the client is created with `detectSessionInUrl`, so the exchange
 * happens automatically. This is a no-op there beyond scrubbing the OAuth
 * parameters out of the address bar.
 */
export async function consumeRedirectResult(): Promise<AppUser | null> {
  if (getAuthProvider() === 'supabase') {
    cleanUpSupabaseUrl();
    return null;
  }
  if (!isAuthConfigured()) return null;
  try {
    const result = await getRedirectResult(getFirebaseAuth());
    return toAppUserFromFirebase(result?.user ?? null);
  } catch (error) {
    // A failed redirect result should not block app startup.
    // eslint-disable-next-line no-console
    console.warn('[auth] redirect result error:', describeAuthError(error));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sign in / out
// ---------------------------------------------------------------------------

/**
 * Starts Google sign-in.
 *
 * Firebase: popup first, falling back to redirect ONLY when the popup was
 * blocked — if the user simply closed the popup we must not navigate their page
 * away without consent.
 *
 * Supabase: always the redirect (OAuth) flow.
 *
 * Returns the user on immediate success, or null when the browser is
 * navigating away and the result will arrive through `onAuthStateChanged`.
 */
export async function signInWithGoogle(): Promise<AppUser | null> {
  if (getAuthProvider() === 'supabase') {
    await signInWithGoogleSupabase();
    // Redirect started; the session arrives via onAuthStateChanged.
    return null;
  }

  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    return toAppUserFromFirebase(result.user);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? '';

    // Only hijack the page with a redirect when the popup could not open at all.
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      code === 'auth/web-storage-unsupported'
    ) {
      await signInWithRedirect(auth, provider);
      // Page navigates away here; the result is handled by consumeRedirectResult.
      return null;
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  if (getAuthProvider() === 'supabase') {
    await signOutSupabase();
    return;
  }
  await fbSignOut(getFirebaseAuth());
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

/**
 * Maps a Supabase auth error to a message the user can act on.
 *
 * `validation_failed` / `bad_oauth_callback` are called out because they are
 * the likely failures on a preview host: Supabase rejects any callback URL not
 * on its redirect allow-list.
 */
export function describeSupabaseError(error: unknown): string {
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

/**
 * Maps a Firebase Auth error to a message the user can act on.
 *
 * `auth/unauthorized-domain` is called out specially because it is by far the
 * most likely failure when running on a preview/staging host: Firebase rejects
 * any origin not on the Authorized Domains allowlist.
 */
export function describeAuthError(error: unknown): string {
  if (getAuthProvider() === 'supabase') return describeSupabaseError(error);

  const code = (error as { code?: string } | null)?.code ?? '';
  const origin = currentOrigin();

  switch (code) {
    case 'auth/unauthorized-domain':
      return origin
        ? `This domain (${origin}) is not allowed to sign in. In Firebase Console go to Authentication → Settings → Authorized domains and add it.`
        : 'This domain is not allowed to sign in. Add it under Authentication → Settings → Authorized domains in the Firebase Console.';

    case 'auth/operation-not-allowed':
      return 'The Google sign-in provider is disabled. Enable it in Firebase Console → Authentication → Sign-in method → Google.';

    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured for this project. Enable a sign-in provider (Google) in the Firebase Console.';

    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'The Firebase API key is invalid. Check EXPO_PUBLIC_FIREBASE_API_KEY in your .env, then restart the dev server.';

    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked by your browser. Allow popups for this site and try again.';

    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';

    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase. Check your connection and try again.';

    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email but a different sign-in method.';

    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Wait a moment and try again.';

    default: {
      const message = (error as { message?: string } | null)?.message;
      return message ? `Sign-in failed: ${message}` : 'Sign-in failed. Please try again.';
    }
  }
}

/** True when the user cancelled rather than hitting a real failure. */
export function isCancellation(error: unknown): boolean {
  if (getAuthProvider() === 'supabase') {
    const code =
      (error as { code?: string; name?: string } | null)?.code ??
      (error as { name?: string } | null)?.name ??
      '';
    return code === 'access_denied' || code === 'user_cancelled';
  }

  const code = (error as { code?: string } | null)?.code ?? '';
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
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

  let code = '';
  if (getAuthProvider() === 'supabase') {
    // Supabase reports failures through either `code` or `name`. A plain
    // `new Error(...)` has name "Error", which is noise rather than a
    // diagnostic, so it is excluded.
    const e = error as { code?: string; name?: string } | null;
    const name = e?.name && e.name !== 'Error' ? e.name : '';
    code = e?.code || name || '';
  } else {
    code = (error as { code?: string } | null)?.code ?? '';
  }

  return code ? `${message}\n\nError code: ${code}` : message;
}
