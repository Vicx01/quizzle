/**
 * Quizzle — Firebase configuration.
 *
 * Initializes Firebase Authentication and Firestore.
 * Configuration values come from environment variables — never hardcoded.
 * AI provider keys are never stored here; they live server-side only.
 *
 * SECURITY: only `EXPO_PUBLIC_FIREBASE_*` values belong in the client. These are
 * Firebase *web* config values, which are public by design — they identify the
 * project but grant no access. Access is enforced by Firestore security rules and
 * the Auth authorized-domains allowlist, NOT by keeping these values secret.
 * Never add a service-account key or AI provider key here.
 */

import type { FirebaseApp } from 'firebase/app';
import { initializeApp, getApps } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { looksLikePlaceholder, type ConfigProblem, type ConfigStatus } from './configStatus';

// Re-exported so existing imports of these types from this module keep working
// now that they live in a shared, provider-neutral home.
export { looksLikePlaceholder, type ConfigProblem, type ConfigStatus };

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
} as const;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

// ---------------------------------------------------------------------------
// Configuration diagnostics
// ---------------------------------------------------------------------------

/** Variables required before Google sign-in can possibly work. */
export const REQUIRED_FIREBASE_ENV = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

/** Recommended but not blocking; surfaced as a warning. */
export const RECOMMENDED_FIREBASE_ENV = [
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
] as const;

/** Firebase project IDs: 6–30 chars, lowercase letters, digits, hyphens. */
function isValidProjectId(value: string): boolean {
  return /^[a-z][a-z0-9-]{4,29}$/.test(value);
}

/** authDomain must be a hostname, e.g. `my-project.firebaseapp.com`. */
function isValidAuthDomain(value: string): boolean {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value) && !/\s/.test(value);
}

/**
 * Full configuration diagnostic. This is the single source of truth used by the
 * sign-in screen to explain exactly what is wrong, so a misconfigured deploy
 * never leaves the user staring at a sign-in button that silently fails.
 */
export function getFirebaseConfigStatus(): ConfigStatus {
  const errors: ConfigProblem[] = [];
  const warnings: ConfigProblem[] = [];

  const values: Record<string, string | undefined> = {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };

  for (const key of REQUIRED_FIREBASE_ENV) {
    const raw = values[key];
    const value = raw?.trim();

    if (!value) {
      errors.push({ key, kind: 'missing', message: `${key} is not set` });
      continue;
    }
    if (looksLikePlaceholder(value)) {
      errors.push({
        key,
        kind: 'placeholder',
        message: `${key} still has its placeholder value ("${value}")`,
      });
      continue;
    }
    if (key === 'EXPO_PUBLIC_FIREBASE_PROJECT_ID' && !isValidProjectId(value)) {
      errors.push({
        key,
        kind: 'invalid',
        message: `${key} ("${value}") is not a valid Firebase project ID`,
      });
      continue;
    }
    if (key === 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN' && !isValidAuthDomain(value)) {
      errors.push({
        key,
        kind: 'invalid',
        message: `${key} ("${value}") must be a hostname, e.g. my-project.firebaseapp.com`,
      });
    }
  }

  for (const key of RECOMMENDED_FIREBASE_ENV) {
    const value = values[key]?.trim();
    if (!value || looksLikePlaceholder(value)) {
      warnings.push({
        key,
        kind: 'recommended-missing',
        message: `${key} is not set (optional for sign-in)`,
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Backwards-compatible helper: returns the list of required variables that are
 * missing or unusable. Prefer `getFirebaseConfigStatus()` for user-facing output.
 */
export function validateFirebaseConfig(): string[] {
  return getFirebaseConfigStatus().errors.map(e => e.key);
}

export { firebaseConfig };
