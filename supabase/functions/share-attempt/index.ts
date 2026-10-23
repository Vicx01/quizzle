/**
 * Attempt submission and grading — POST /share-attempt?token=…
 *
 * Accepts a taker's answers, grades them SERVER-SIDE against the answer key,
 * and returns the result.
 *
 * Why grading cannot happen in the client: the client is never sent the key
 * (see share-resolve), so it has nothing to grade against. That is the point —
 * shipping the key to the browser would let anyone read every answer before
 * attempting, and would make the whole answer-key separation in the schema
 * pointless.
 *
 * Why the attempt is written here and not by the client: `quiz_attempts` and
 * `attempt_answers` have SELECT-only client policies. A client insert is
 * rejected with 42501, which was verified against the live database. Scores
 * are therefore authoritative by construction — a user cannot award themselves
 * points, because there is no path by which they could write one.
 *
 * Runs under the service-role key. Possession of the token is the
 * authorisation; anonymous attempts are supported (user_id = null).
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

import { gradeSubmission, validateAnswers, type GradableQuestion } from '../_shared/grade.ts';
import {
  badRequest,
  jsonOk,
  notFound,
  options,
  serverError,
  tooManyRequests,
} from '../_shared/respond.ts';
import { isValidTokenFormat, redactToken } from '../_shared/token.ts';
import {
  ATTEMPT_LIMIT,
  WINDOW_MS,
  checkRateLimit,
  clientIp,
  rateLimitKey,
} from '../_shared/rateLimit.ts';

const MAX_BODY_BYTES = 64 * 1024;

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return options(origin);
  if (req.method !== 'POST') return notFound(origin);

  const token = new URL(req.url).searchParams.get('token');
  if (!isValidTokenFormat(token)) return notFound(origin);

  const limit = checkRateLimit(
    rateLimitKey(clientIp(req.headers), token),
    ATTEMPT_LIMIT,
    WINDOW_MS
  );
  if (!limit.allowed) return tooManyRequests(limit.retryAfter, origin);

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return badRequest('Request body is too large.', origin);
    body = text ? JSON.parse(text) : null;
  } catch {
    return badRequest('Request body must be valid JSON.', origin);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Re-run the full share validation. An attempt is only accepted through a
    // link that is currently usable — this is not a separate weaker path.
    const { data: resolved, error: resolveError } = await supabase.rpc('resolve_share_link', {
      p_token: token,
    });
    if (resolveError) return serverError(origin);

    const row = Array.isArray(resolved) ? resolved[0] : resolved;
    if (!row?.quiz_id) return notFound(origin);

    const quizId = row.quiz_id as string;
    const shareLinkId = row.share_link_id as string;

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, deleted_at')
      .eq('id', quizId)
      .maybeSingle();
    if (quizError || !quiz || quiz.deleted_at) return notFound(origin);

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, position, type, prompt, options')
      .eq('quiz_id', quizId)
      .order('position', { ascending: true });
    if (questionsError || !questions || questions.length === 0) return notFound(origin);

    const validation = validateAnswers(
      (body as { answers?: unknown } | null)?.answers,
      questions as GradableQuestion[]
    );
    if (!validation.ok) return badRequest(validation.reason, origin);

    // The key is read here, on the server, and never leaves this function
    // except inside the graded response below.
    const questionIds = (questions as { id: string }[]).map(q => q.id);
    const { data: keys, error: keysError } = await supabase
      .from('question_answer_keys')
      .select('question_id, correct_answer, explanation')
      .in('question_id', questionIds);
    if (keysError) return serverError(origin);

    const outcome = gradeSubmission(
      questions as GradableQuestion[],
      (keys ?? []) as { question_id: string; correct_answer: string; explanation: string | null }[],
      validation.answers
    );

    // Record the attempt under service_role. There is no client path that can
    // write these rows, so the score cannot be forged.
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        // Anonymous by design: a share link authorises the attempt. If the
        // caller later sends a session we could resolve it, but a token holder
        // has no account and none should be invented for them.
        user_id: null,
        share_link_id: shareLinkId,
        status: outcome.fullyGraded ? 'graded' : 'submitted',
        score: outcome.fullyGraded ? outcome.score : null,
        max_score: questions.length,
        submitted_at: new Date().toISOString(),
        graded_at: outcome.fullyGraded ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (attemptError || !attempt) {
      console.error('[share-attempt] could not record attempt', {
        token: redactToken(token),
        code: attemptError?.code,
      });
      return serverError(origin);
    }

    const { error: answersError } = await supabase
      .from('attempt_answers')
      .insert(outcome.answerRows.map(row => ({ ...row, attempt_id: attempt.id })));
    if (answersError) {
      console.error('[share-attempt] could not record answers', {
        attemptId: attempt.id,
        code: answersError.code,
      });
      return serverError(origin);
    }

    // The access is counted only once the attempt is safely recorded.
    await supabase.rpc('record_share_access', { p_token: token });

    const payload = {
      attemptId: attempt.id,
      score: outcome.fullyGraded ? outcome.score : null,
      total: outcome.total,
      // Surfaced so the UI can say "7 of 10 marked — the rest need review"
      // instead of silently reporting a misleading "7 / 10".
      fullyGraded: outcome.fullyGraded,
      perQuestion: outcome.perQuestion.map(q => ({
        id: q.id,
        correct: q.correct,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        givenAnswer: q.givenAnswer,
      })),
    };

    return jsonOk(payload, origin);
  } catch (error) {
    console.error('[share-attempt] unexpected error', {
      token: redactToken(token),
      message: error instanceof Error ? error.message : String(error),
    });
    return serverError(origin);
  }
});
