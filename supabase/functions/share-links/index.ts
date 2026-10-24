/**
 * Share-link management — create, revoke, list.
 *
 *   POST   /share-links  { quizId, expiresInDays?, maxAccess? }  -> mints a link
 *   DELETE /share-links  ?id=<linkId>                            -> revokes it
 *   GET    /share-links  ?quizId=<id>                            -> lists links
 *
 * WHY THIS IS A FUNCTION AT ALL
 *
 * `public.share_links` has a SELECT-only policy and deliberately NO insert,
 * update or delete policy. A client cannot mint a link, cannot revoke one, and
 * cannot touch `access_count`. Links are credentials, so only the server issues
 * them.
 *
 * UNLIKE share-resolve and share-attempt, THIS FUNCTION REQUIRES A JWT.
 * Minting a link for someone else's quiz would be a serious hole, so the
 * caller's identity comes from a token verified against GoTrue — never from a
 * field in the request body.
 *
 * WHERE OWNERSHIP IS ENFORCED
 *
 * It is enforced TWICE, on purpose. `public.create_share_link()` re-checks
 * ownership inside the database before it will insert, and this function also
 * checks up front so a bad request gets a clean 404 instead of a 500. The
 * database check is the authoritative one: the write path runs under the
 * service-role key, which bypasses RLS entirely, so there is no policy that
 * could save us if it were missing.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

import { generateToken } from '../_shared/token.ts';
import {
  badRequest,
  jsonOk,
  notFound,
  options,
  serverError,
  tooManyRequests,
  unauthorized,
} from '../_shared/respond.ts';
import {
  MANAGE_LIMIT,
  WINDOW_MS,
  checkRateLimit,
  clientIp,
  rateLimitKey,
} from '../_shared/rateLimit.ts';

/** The schema caps a link at 30 days from creation; stay inside it. */
const MAX_EXPIRY_DAYS = 30;
const DEFAULT_EXPIRY_DAYS = 7;
const MAX_LINKS_PER_QUIZ = 20;

function env() {
  return {
    url: Deno.env.get('SUPABASE_URL') ?? '',
    anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  };
}

function adminClient() {
  const e = env();
  return createClient(e.url, e.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Establishes the caller's identity from the Authorization header.
 *
 * The token is VERIFIED by exchanging it with GoTrue rather than by decoding it
 * locally — an unverified JWT can be forged by anyone who knows the payload
 * shape.
 */
async function callerId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const e = env();
  const userClient = createClient(e.url, e.anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

/** True when the caller owns a non-deleted quiz. Checked before every write. */
async function ownsQuiz(quizId: string, userId: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from('quizzes')
    .select('owner_id, deleted_at')
    .eq('id', quizId)
    .maybeSingle();

  if (error || !data) return false;
  if (data.deleted_at) return false;
  return data.owner_id === userId;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return options(origin);

  const userId = await callerId(req);
  if (!userId) return unauthorized(origin);

  const limit = checkRateLimit(
    rateLimitKey(clientIp(req.headers), userId),
    MANAGE_LIMIT,
    WINDOW_MS
  );
  if (!limit.allowed) return tooManyRequests(limit.retryAfter, origin);

  try {
    if (req.method === 'POST') return await handleCreate(req, userId, origin);
    if (req.method === 'DELETE') return await handleRevoke(req, userId, origin);
    if (req.method === 'GET') return await handleList(req, userId, origin);
    return notFound(origin);
  } catch (error) {
    console.error('[share-links] unexpected error', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    return serverError(origin);
  }
});

async function handleCreate(
  req: Request,
  userId: string,
  origin: string | null
): Promise<Response> {
  let body: { quizId?: unknown; expiresInDays?: unknown; maxAccess?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON.', origin);
  }

  // quizId is untrusted input; it is validated against ownership, not believed.
  const quizId = typeof body.quizId === 'string' ? body.quizId : null;
  if (!quizId) return badRequest('`quizId` is required.', origin);

  if (!(await ownsQuiz(quizId, userId))) {
    // Identical to "no such quiz", so this cannot be used to probe quiz ids.
    return notFound(origin);
  }

  let expiresInDays = DEFAULT_EXPIRY_DAYS;
  if (body.expiresInDays !== undefined) {
    const n = Number(body.expiresInDays);
    if (!Number.isInteger(n) || n < 1 || n > MAX_EXPIRY_DAYS) {
      return badRequest(
        `\`expiresInDays\` must be an integer between 1 and ${MAX_EXPIRY_DAYS}.`,
        origin
      );
    }
    expiresInDays = n;
  }

  let maxAccess: number | null = null;
  if (body.maxAccess !== undefined && body.maxAccess !== null) {
    const n = Number(body.maxAccess);
    if (!Number.isInteger(n) || n < 1) {
      return badRequest('`maxAccess` must be a positive integer.', origin);
    }
    maxAccess = n;
  }

  const admin = adminClient();

  const { count, error: countError } = await admin
    .from('share_links')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .is('revoked_at', null);
  if (countError) return serverError(origin);
  if ((count ?? 0) >= MAX_LINKS_PER_QUIZ) {
    return badRequest(`A quiz can have at most ${MAX_LINKS_PER_QUIZ} active share links.`, origin);
  }

  // Generated here and returned exactly once. Only its SHA-256 hash is stored,
  // so a lost link must be revoked and reissued — never looked up.
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();

  // The insert happens in SQL so the raw token never becomes a query parameter
  // that a proxy or log could capture, and so ownership is re-checked there.
  const { data: linkId, error: createError } = await admin.rpc('create_share_link', {
    p_quiz_id: quizId,
    p_token: token,
    p_expires_at: expiresAt,
    p_max_access: maxAccess,
    p_owner_id: userId,
  });

  if (createError || !linkId) {
    console.error('[share-links] create failed', { userId, code: createError?.code });
    return serverError(origin);
  }

  return jsonOk({ linkId, token, expiresAt, maxAccess }, origin);
}

async function handleRevoke(
  req: Request,
  userId: string,
  origin: string | null
): Promise<Response> {
  const linkId = new URL(req.url).searchParams.get('id');
  if (!linkId) return badRequest('`id` is required.', origin);

  // Scoped by created_by as well as id, so one user cannot revoke another's
  // link by guessing its identifier.
  const { data, error } = await adminClient()
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', linkId)
    .eq('created_by', userId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();

  if (error) return serverError(origin);

  // Revoking an already-revoked or unknown link reports success: the desired
  // end state holds either way, and a distinct "already gone" answer would let
  // a caller confirm which link ids exist.
  return jsonOk({ revoked: true, linkId: data?.id ?? linkId }, origin);
}

async function handleList(req: Request, userId: string, origin: string | null): Promise<Response> {
  const quizId = new URL(req.url).searchParams.get('quizId');
  if (!quizId) return badRequest('`quizId` is required.', origin);

  if (!(await ownsQuiz(quizId, userId))) return notFound(origin);

  const { data, error } = await adminClient()
    .from('share_links')
    .select('id, expires_at, revoked_at, access_count, max_access, token_hint, created_at')
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false });

  if (error) return serverError(origin);

  // token_hash is never selected here — it is not useful to a client and there
  // is no reason to let it travel.
  return jsonOk({ links: data ?? [] }, origin);
}
