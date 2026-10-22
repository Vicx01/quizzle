/**
 * Quizzle — Authentication service.
 *
 * Firebase Authentication with Google sign-in (web primary, native later).
 * Google-only sign-in — no email/password, no social alternatives.
 *
 * STATUS: web flow implemented but UNVERIFIED. It has never been executed
 * against a real Firebase project. Do not claim sign-in works until it has been
 * exercised successfully — see docs/FIREBASE_SETUP.md for the verification steps.
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
import { getFirebaseAuth, getFirebaseConfigStatus } from './firebase';

// Re-export for convenience
export { getFirebaseAuth };

/**
 * True when the Firebase environment variables required for sign-in are present
 * and look usable. The app shows an actionable "not configured" state instead of
 * offering a sign-in button that would silently fail.
 */
export function isAuthConfigured(): boolean {
  return getFirebaseConfigStatus().ok;
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return fbOnAuthStateChanged(auth, callback);
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
 * other way to read the value that must be allowlisted in Firebase.
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

/**
 * Maps a Firebase Auth error to a message the user can act on.
 *
 * `auth/unauthorized-domain` is called out specially because it is by far the
 * most likely failure when running on a preview/staging host: Firebase rejects
 * any origin not on the Authorized Domains allowlist.
 */
export function describeAuthError(error: unknown): string {
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
  const code = (error as { code?: string } | null)?.code ?? '';
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}

/**
 * `describeAuthError` plus the raw Firebase error code.
 *
 * The code is shown because some failures (notably a Google 403 raised before
 * Firebase returns a typed error) are far easier to diagnose with the exact
 * identifier than with the prose message alone.
 */
export function describeAuthErrorWithCode(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  const message = describeAuthError(error);
  return code ? `${message}\n\nError code: ${code}` : message;
}

/**
 * Completes a redirect-based sign-in after the browser returns to the app.
 *
 * This must be called ONCE on startup, not after `signInWithRedirect` — by the
 * time the redirect completes the original page has been torn down. The previous
 * implementation called `getRedirectResult` immediately after
 * `signInWithRedirect`, which always returned null.
 *
 * Returns the signed-in user, or null if there was no pending redirect.
 */
export async function consumeRedirectResult(): Promise<User | null> {
  if (!isAuthConfigured()) return null;
  try {
    const result = await getRedirectResult(getFirebaseAuth());
    return result?.user ?? null;
  } catch (error) {
    // A failed redirect result should not block app startup.
    // eslint-disable-next-line no-console
    console.warn('[auth] redirect result error:', describeAuthError(error));
    return null;
  }
}

/**
 * Starts Google sign-in.
 *
 * Uses the popup flow first. Falls back to redirect ONLY when the popup was
 * blocked — if the user simply closed the popup we must not navigate their page
 * away without consent.
 *
 * On a redirect fallback the page will navigate away and reload; the result is
 * picked up by `consumeRedirectResult()` on startup.
 */
export async function signInWithGoogle(): Promise<User | null> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
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
  const auth = getFirebaseAuth();
  await fbSignOut(auth);
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}
