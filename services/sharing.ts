/**
 * Quizzle — client access to the share endpoints.
 *
 * Everything here talks to an Edge Function rather than to a table, and that is
 * deliberate:
 *
 *   * `share_links` has a SELECT-only policy, so only the server can mint or
 *     revoke a link.
 *   * A quiz taker has no read access to the quiz at all, so the quiz can only
 *     arrive through `share-resolve`, which strips the answer key.
 *   * `quiz_attempts` has no client write policy, so a score can only be
 *     recorded by `share-attempt` after it has graded the submission.
 *
 * A taker is usually ANONYMOUS — that is the point of a share link — so none of
 * these calls require a session.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A quiz as a taker receives it. Contains no answers. */
export interface SharedQuestion {
  id: string;
  type: 'MCQ' | 'theory';
  prompt: string;
  options: string[] | null;
  latexBlocks: string[] | null;
}

export interface SharedQuiz {
  quizId: string;
  title: string;
  format: string;
  difficulty: string;
  questionCount: number;
  timerSeconds: number | null;
  questions: SharedQuestion[];
}

export interface AttemptResult {
  attemptId: string;
  /** null when theory questions await human marking. */
  score: number | null;
  total: number;
  fullyGraded: boolean;
  perQuestion: {
    id: string;
    correct: boolean | null;
    correctAnswer: string;
    explanation: string | null;
    givenAnswer: string | null;
  }[];
}

export interface ShareLink {
  linkId: string;
  /** Returned ONCE at creation. Unrecoverable afterwards. */
  token?: string;
  expiresAt: string;
  maxAccess: number | null;
}

export interface ShareLinkSummary {
  id: string;
  expires_at: string;
  revoked_at: string | null;
  access_count: number;
  max_access: number | null;
  token_hint: string | null;
  created_at: string;
}

export class SharingError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'SharingError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The URL a taker opens. Web-only; native deep links are not implemented. */
export function buildShareUrl(token: string): string {
  const base =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  return `${base}?share=${encodeURIComponent(token)}`;
}

/** Reads a share token out of the current URL, if present. */
export function shareTokenFromLocation(): string | null {
  if (typeof window === 'undefined' || !window.location?.search) return null;
  return new URLSearchParams(window.location.search).get('share');
}

/**
 * Pulls a readable message out of a FunctionsHttpError.
 *
 * The client throws before delivering the body, so the payload has to be read
 * off the error's `context` (a Response) when present.
 */
async function messageFromInvoke(error: unknown, fallback: string): Promise<SharingError> {
  const e = error as { context?: { json?: () => Promise<unknown>; status?: number } };
  if (e?.context?.json) {
    try {
      const body = (await e.context.json()) as { error?: string };
      if (body?.error) return new SharingError(body.error, e.context.status);
    } catch {
      // Body was not JSON; fall through to the generic message.
    }
  }
  const message = error instanceof Error ? error.message : fallback;
  return new SharingError(message || fallback);
}

// ---------------------------------------------------------------------------
// Taker (anonymous) paths
// ---------------------------------------------------------------------------

/**
 * Loads a shared quiz WITHOUT its answer key.
 *
 * Throws a SharingError carrying the server's message. Expired, revoked,
 * exhausted and unknown links are indistinguishable by design.
 */
export async function resolveSharedQuiz(token: string): Promise<SharedQuiz> {
  if (!isSupabaseConfigured()) throw new SharingError('Supabase is not configured.');

  const { data, error } = await getSupabaseClient().functions.invoke<SharedQuiz>(
    `share-resolve?token=${encodeURIComponent(token)}`,
    { method: 'GET' }
  );

  if (error) throw await messageFromInvoke(error, 'This link is not available.');
  if (!data) throw new SharingError('This link is not available.');
  return data;
}

/**
 * Submits answers and receives the graded result.
 *
 * Grading happens on the server. The correct answers appear only in this
 * response, after submission — there is no earlier point at which the client
 * could have seen them.
 */
export async function submitSharedAttempt(
  token: string,
  answers: Record<string, string>
): Promise<AttemptResult> {
  if (!isSupabaseConfigured()) throw new SharingError('Supabase is not configured.');

  const { data, error } = await getSupabaseClient().functions.invoke<AttemptResult>(
    `share-attempt?token=${encodeURIComponent(token)}`,
    { method: 'POST', body: { answers } }
  );

  if (error) throw await messageFromInvoke(error, 'Your answers could not be submitted.');
  if (!data) throw new SharingError('Your answers could not be submitted.');
  return data;
}

// ---------------------------------------------------------------------------
// Owner paths (require a session)
// ---------------------------------------------------------------------------

export interface CreateLinkOptions {
  expiresInDays?: number;
  maxAccess?: number | null;
}

/**
 * Mints a share link for one of the caller's quizzes.
 *
 * The server re-verifies ownership, so this cannot be used on someone else's
 * quiz — it would simply 404.
 */
export async function createShareLink(
  quizId: string,
  options: CreateLinkOptions = {}
): Promise<ShareLink> {
  if (!isSupabaseConfigured()) throw new SharingError('Supabase is not configured.');

  const body: Record<string, unknown> = { quizId };
  if (options.expiresInDays !== undefined) body.expiresInDays = options.expiresInDays;
  if (options.maxAccess !== undefined) body.maxAccess = options.maxAccess;

  const { data, error } = await getSupabaseClient().functions.invoke<ShareLink>('share-links', {
    method: 'POST',
    body,
  });

  if (error) throw await messageFromInvoke(error, 'The share link could not be created.');
  if (!data) throw new SharingError('The share link could not be created.');
  return data;
}

/** Revokes a link. Revoking an unknown or already-revoked link is a no-op. */
export async function revokeShareLink(linkId: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new SharingError('Supabase is not configured.');

  const { error } = await getSupabaseClient().functions.invoke(
    `share-links?id=${encodeURIComponent(linkId)}`,
    { method: 'DELETE' }
  );

  if (error) throw await messageFromInvoke(error, 'The share link could not be revoked.');
}

/** Lists links for one of the caller's quizzes. */
export async function listShareLinks(quizId: string): Promise<ShareLinkSummary[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabaseClient().functions.invoke<{ links: ShareLinkSummary[] }>(
    `share-links?quizId=${encodeURIComponent(quizId)}`,
    { method: 'GET' }
  );

  if (error) throw await messageFromInvoke(error, 'Share links could not be loaded.');
  return data?.links ?? [];
}
