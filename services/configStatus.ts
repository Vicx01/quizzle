/**
 * Quizzle — shared configuration diagnostics.
 *
 * Supabase Auth reports its configuration health through this shape so the
 * sign-in screen can render a precise setup checklist.
 *
 * The app must never show a sign-in button that cannot work. Every provider
 * therefore answers "am I configured?" and, when not, names the exact
 * variables that are missing, still templated, or malformed.
 */

export type ConfigProblemKind =
  'missing' | 'placeholder' | 'invalid' | 'recommended-missing' | 'unsafe';

export type ConfigProblem = {
  key: string;
  kind: ConfigProblemKind;
  message: string;
};

export type ConfigStatus = {
  /** True when every required variable is present and looks usable. */
  ok: boolean;
  /** Blocking problems (missing, placeholder, malformed, or unsafe). */
  errors: ConfigProblem[];
  /** Non-blocking gaps. */
  warnings: ConfigProblem[];
};

/**
 * Substrings that indicate a value was never filled in — for example leaving
 * template text like `your-project-id` in `.env`. Catching these turns a
 * confusing runtime error into a clear "you forgot to set this" message.
 */
const PLACEHOLDER_MARKERS = [
  'your-',
  'your_',
  'placeholder',
  'changeme',
  'change-me',
  'xxx',
  'todo',
  '<',
  '>',
  'example',
];

/** True if the value still looks like an unfilled template placeholder. */
export function looksLikePlaceholder(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (!v) return false;
  // A run of zeros (e.g. appId "1:000000000000:...") is also a placeholder.
  if (/^1?:?0{6,}/.test(v.replace(/[^0-9:]/g, ''))) return true;
  return PLACEHOLDER_MARKERS.some(marker => v.includes(marker));
}

/**
 * A value that has clearly been committed by accident.
 *
 * Only the service-role key is checked. The anon/publishable key is designed
 * to be shipped in client bundles and is safe here — protecting it is the job
 * of Row Level Security, which is enabled on every table. The service-role key
 * bypasses RLS entirely, so finding one in an `EXPO_PUBLIC_*` variable is a
 * serious mistake worth blocking the build over.
 */
/**
 * Reads the `role` claim out of a JWT without verifying its signature.
 *
 * Verification is irrelevant here: this only inspects a value the developer has
 * already placed in the bundle, and it never trusts the token for access.
 * `atob` is available in browsers, React Native and Node 16+, so no Buffer
 * dependency is introduced into client code.
 */
function decodeJwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  if (typeof atob !== 'function') return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const parsed = JSON.parse(atob(padded)) as { role?: unknown };
    return typeof parsed.role === 'string' ? parsed.role : null;
  } catch {
    // Not a decodable JWT. Caller falls back to a plain substring check.
    return null;
  }
}

export function looksLikeServiceRoleKey(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim();

  // Supabase's newer secret keys carry a readable prefix.
  if (/^sb_secret_/i.test(v)) return true;

  // Legacy keys are JWTs whose payload carries role=service_role. The encoded
  // token does not contain that text, so a substring search on the raw value
  // would miss it — the payload has to be decoded.
  if (decodeJwtRole(v) === 'service_role') return true;

  return v.includes('"role":"service_role"') || v.includes('"role": "service_role"');
}

export const CONFIGURED_STATUS: ConfigStatus = {
  ok: true,
  errors: [],
  warnings: [],
};

/**
 * Convenience builder for the "nothing blocking" case. Warnings are by
 * definition non-blocking, so `ok` is true regardless of how many there are.
 */
export function okStatus(warnings: ConfigProblem[] = []): ConfigStatus {
  return { ok: true, errors: [], warnings };
}
