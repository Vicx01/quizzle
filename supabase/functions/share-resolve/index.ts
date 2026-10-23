/**
 * Share link resolution — GET /share-resolve?token=…
 *
 * Returns the quiz a share link points at, WITHOUT its answer key.
 *
 * This is the endpoint that makes sharing possible at all. Clients have no
 * read access to a quiz they do not own (RLS denies it), so a taker can only
 * receive the quiz through here. The response is assembled from an explicit
 * allowlist, which is why the answer key cannot leak even if a new sensitive
 * column is added to the table later.
 *
 * Runs under the service-role key. Possession of the token IS the
 * authorisation; there is no session.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

import { buildSharedQuiz, assertNoAnswerKey } from '../_shared/allowlist.ts';
import { notFound, jsonOk, options, serverError, tooManyRequests } from '../_shared/respond.ts';
import { isValidTokenFormat, redactToken } from '../_shared/token.ts';
import {
  WINDOW_MS,
  checkRateLimit,
  clientIp,
  rateLimitKey,
  RESOLVE_LIMIT,
} from '../_shared/rateLimit.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return options(origin);
  if (req.method !== 'GET') return notFound(origin);

  const token = new URL(req.url).searchParams.get('token');

  if (!isValidTokenFormat(token)) {
    // A malformed token is rejected on shape alone, without touching the
    // database. Same response as any other failure — no oracle.
    return notFound(origin);
  }

  const limit = checkRateLimit(
    rateLimitKey(clientIp(req.headers), token),
    RESOLVE_LIMIT,
    WINDOW_MS
  );
  if (!limit.allowed) return tooManyRequests(limit.retryAfter, origin);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Validation lives in the database so it cannot drift between endpoints.
    // resolve_share_link() checks the hash, revocation, expiry and the access
    // cap in one statement.
    const { data: resolved, error: resolveError } = await supabase.rpc('resolve_share_link', {
      p_token: token,
    });

    if (resolveError) {
      console.error('[share-resolve] resolve failed', {
        token: redactToken(token),
        code: resolveError.code,
      });
      return serverError(origin);
    }

    const row = Array.isArray(resolved) ? resolved[0] : resolved;
    if (!row?.quiz_id) return notFound(origin);

    const quizId = row.quiz_id as string;

    // service_role bypasses RLS, so the soft-delete filter must be applied
    // explicitly — the client-facing SELECT policy would have done it.
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, format, difficulty, question_count, timer_seconds, deleted_at')
      .eq('id', quizId)
      .maybeSingle();

    if (quizError || !quiz || quiz.deleted_at) return notFound(origin);

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, position, type, prompt, options, latex_blocks')
      .eq('quiz_id', quizId)
      .order('position', { ascending: true });

    if (questionsError || !questions) return notFound(origin);

    // Count the access atomically AFTER the content has been read, so a failed
    // read does not consume one of the link's uses.
    const { data: newCount, error: accessError } = await supabase.rpc('record_share_access', {
      p_token: token,
    });

    if (accessError || newCount === null || newCount === undefined) return notFound(origin);

    const payload = buildSharedQuiz(quiz, questions);
    assertNoAnswerKey(payload);

    return jsonOk(payload, origin);
  } catch (error) {
    console.error('[share-resolve] unexpected error', {
      token: redactToken(token),
      message: error instanceof Error ? error.message : String(error),
    });
    return serverError(origin);
  }
});
