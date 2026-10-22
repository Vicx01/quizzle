/**
 * Quizzle — Authentication service.
 *
 * Firebase Authentication with Google sign-in (web and native).
 * Google-only sign-in — no email/password, no social alternatives.
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
import { getFirebaseAuth, validateFirebaseConfig } from './firebase';

// Re-export for convenience
export { getFirebaseAuth };

/**
 * True when the Firebase environment variables required for sign-in are present.
 * The app uses this to show an honest "not configured" message instead of
 * crashing or pretending sign-in works.
 */
export function isAuthConfigured(): boolean {
  return validateFirebaseConfig().length === 0;
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return fbOnAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();

  try {
    // Try popup first (works on web desktop)
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (popupError: any) {
    // If popup is blocked or not available, try redirect (works on mobile/web)
    if (
      popupError.code === 'auth/popup-blocked' ||
      popupError.code === 'auth/popup-closed-by-user'
    ) {
      await signInWithRedirect(auth, provider);
      // getRedirectResult resolves after redirect completes
      const result = await getRedirectResult(auth);
      if (result?.user) {
        return result.user;
      }
    }
    throw popupError;
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
