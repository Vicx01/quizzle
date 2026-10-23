/**
 * Rate limiting for the share endpoints.
 *
 * IMPORTANT LIMITATION, stated plainly:
 *
 * This is an in-memory, per-instance limiter. Supabase Edge Functions are
 * ephemeral and may run many concurrent isolates, so this does NOT provide a
 * hard global guarantee — an attacker who can spread requests across instances
 * can exceed it. It exists to blunt casual abuse and accidental loops, not to
 * stop a determined attacker.
 *
 * The AUTHORITATIVE limits are the ones enforced in the database, which cannot
 * be bypassed by spreading load:
 *
 *   * `share_links.max_access` caps total uses of a link, incremented
 *     atomically by `record_share_access()`.
 *   * `expires_at` bounds the window, and a CHECK constraint caps it at 30
 *     days from creation.
 *   * `quiz_attempts` / `attempt_answers` have no client write policy at all.
 *
 * A durable limiter would need a table plus an atomic counter (the same
 * pattern as `usage_counters`); that is left for the server-side quota work in
 * Phase 8, which is where the rest of the abuse-prevention story lives.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Sweeps expired entries so the map cannot grow without bound. */
function sweep(now: number): void {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Whole seconds until the window resets, always reported. */
  retryAfter: number;
  remaining: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  sweep(now);

  const existing = buckets.get(key);
  // A fixed window keeps the retry hint honest; a sliding one would require
  // storing every hit timestamp.
  let count: number;
  let resetAt: number;

  if (!existing || existing.resetAt <= now) {
    count = 1;
    resetAt = now + windowMs;
    buckets.set(key, { count, resetAt });
  } else {
    existing.count += 1;
    count = existing.count;
    resetAt = existing.resetAt;
  }

  // The comparison happens once, after the count is settled, so a limit of 0
  // blocks the very first request instead of letting it through.
  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));

  if (count > limit) {
    return { allowed: false, retryAfter, remaining: 0 };
  }
  return { allowed: true, retryAfter, remaining: Math.max(0, limit - count) };
}

/** Defaults: reading a quiz is cheap, submitting is not. */
export const RESOLVE_LIMIT = 60;
export const ATTEMPT_LIMIT = 20;
export const WINDOW_MS = 60_000;

/**
 * Builds a rate-limit key from the caller IP and the token being used.
 *
 * Keying on both means one hostile client cannot exhaust another's budget by
 * hammering a shared link, and one hot link cannot lock out a whole IP.
 */
export function rateLimitKey(ip: string, token: string): string {
  return `${ip}:${token.slice(0, 8)}`;
}

/**
 * Best-effort client IP.
 *
 * Supabase sets `x-forwarded-for`; trusting it blindly is wrong behind an
 * untrusted proxy, but it is the only signal available in an Edge Function and
 * it is only used to key a soft limit.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
