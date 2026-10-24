/**
 * HTTP response helpers for the share endpoints.
 *
 * Two headers are non-negotiable on every response:
 *
 *   * `Cache-Control: no-store` — a shared quiz and, above all, a graded
 *     result must not be cached by a proxy or a browser. A cached score page
 *     is both a privacy leak and a source of stale results.
 *
 *   * A restricted `Access-Control-Allow-Origin` — CORS is not access control,
 *     but an indiscriminate `*` would let any site drive these endpoints.
 */

/** Origins permitted to call the share endpoints from a browser. */
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'https://quizzle.app',
  'https://www.quizzle.app',
];

function allowedOrigins(): string[] {
  const configured = Deno.env.get('ALLOWED_ORIGINS');
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;
  const extra = configured
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_ORIGINS, ...extra];
}

export function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowed = allowedOrigins();
  // Reflect the origin only when it is on the allowlist. A browser refuses the
  // response otherwise, which is the desired failure mode.
  const origin = requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function respond(
  body: unknown,
  status: number,
  requestOrigin: string | null,
  extra: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(requestOrigin),
      ...extra,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function jsonOk(body: unknown, origin: string | null): Response {
  return respond(body, 200, origin);
}

/**
 * The single failure response for a share token that cannot be used.
 *
 * Deliberately identical for unknown, expired, revoked, exhausted and
 * soft-deleted quizzes. A distinct status or message per case would turn this
 * endpoint into an oracle that confirms which links were ever valid.
 */
export function notFound(origin: string | null): Response {
  return respond({ error: 'Share link is not available.' }, 404, origin);
}

/**
 * No valid session, where a session is required.
 *
 * 401 rather than 404: the caller is asking to manage their OWN links, so
 * there is no hidden resource to protect by pretending the route is absent.
 */
export function unauthorized(origin: string | null): Response {
  return respond({ error: 'Sign in to manage share links.' }, 401, origin);
}

export function badRequest(reason: string, origin: string | null): Response {
  return respond({ error: reason }, 400, origin);
}

export function tooManyRequests(retryAfterSeconds: number, origin: string | null): Response {
  return respond({ error: 'Too many requests. Please try again shortly.' }, 429, origin, {
    'Retry-After': String(retryAfterSeconds),
  });
}

export function serverError(origin: string | null): Response {
  // The cause is logged server-side; the client gets nothing it could use to
  // probe the schema.
  return respond({ error: 'Something went wrong.' }, 500, origin);
}

export function options(origin: string | null): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
