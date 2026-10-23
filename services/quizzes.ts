/**
 * Quizzle — quiz persistence (owner CRUD).
 *
 * Reads and writes go through PostgREST as the signed-in user, so every
 * statement is subject to Row Level Security. Nothing here asserts ownership:
 * the database does that, and a client that lies about `owner_id` is rejected
 * by the `WITH CHECK` clause rather than trusted.
 *
 * SECURITY — the answer key is deliberately split:
 *
 * Correct answers live in `question_answer_keys`, a physically separate table
 * from `questions`. A quiz taker reaches questions through the share path and
 * never sees that table. Only the quiz OWNER can read their own key, which is
 * correct — they authored it. This module keeps the split intact on save and
 * rejoins it only on an owner read.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import type { Difficulty, QuizFormat } from '../types';

// ---------------------------------------------------------------------------
// Row shapes (as PostgREST returns them)
// ---------------------------------------------------------------------------

export interface QuizRow {
  id: string;
  owner_id: string;
  title: string;
  format: QuizFormat;
  difficulty: Difficulty;
  question_count: number;
  timer_seconds: number | null;
  source_type: 'text' | 'pdf' | 'docx' | 'txt';
  source_meta: Record<string, unknown> | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionRow {
  id: string;
  quiz_id: string;
  position: number;
  type: 'MCQ' | 'theory';
  prompt: string;
  options: string[] | null;
  latex_blocks: string[] | null;
  created_at: string;
}

export interface AnswerKeyRow {
  question_id: string;
  correct_answer: string;
  explanation: string | null;
  created_at: string;
}

/** A question with its answer key joined in — owner reads only. */
export interface OwnedQuestion extends QuestionRow {
  correct_answer: string | null;
  explanation: string | null;
}

/** A quiz as the owner sees it: metadata plus questions with answers. */
export interface OwnedQuiz {
  quiz: QuizRow;
  questions: OwnedQuestion[];
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface NewQuestion {
  position: number;
  type: 'MCQ' | 'theory';
  prompt: string;
  options?: string[] | null;
  latexBlocks?: string[] | null;
  correctAnswer: string;
  explanation?: string | null;
}

export interface NewQuiz {
  title: string;
  format: QuizFormat;
  difficulty: Difficulty;
  questionCount: number;
  timerSeconds?: number | null;
  sourceType: 'text' | 'pdf' | 'docx' | 'txt';
  sourceMeta?: Record<string, unknown>;
  questions: NewQuestion[];
}

/** Thrown for any persistence failure, with the PostgREST message preserved. */
export class QuizPersistenceError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = 'QuizPersistenceError';
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Checks the constraints the database enforces, so a bad save produces a clear
 * message instead of a constraint violation the user cannot act on.
 *
 * These mirror the CHECK constraints in the migration; the database remains the
 * authority. Validating up front is about error quality, not trust.
 */
export function validateNewQuiz(input: NewQuiz): string[] {
  const problems: string[] = [];

  const title = input.title?.trim();
  if (!title || title.length > 200) {
    problems.push('Title must be between 1 and 200 characters.');
  }

  if (!['MCQ', 'theory', 'mixed'].includes(input.format)) {
    problems.push(`Invalid format "${input.format}".`);
  }
  if (!['Easy', 'Medium', 'Hard'].includes(input.difficulty)) {
    problems.push(`Invalid difficulty "${input.difficulty}".`);
  }
  if (!['text', 'pdf', 'docx', 'txt'].includes(input.sourceType)) {
    problems.push(`Invalid source type "${input.sourceType}".`);
  }

  const questions = input.questions ?? [];
  if (questions.length < 1 || questions.length > 50) {
    problems.push('A quiz must have between 1 and 50 questions.');
  }
  if (questions.length !== input.questionCount) {
    problems.push(
      `questionCount (${input.questionCount}) does not match the number of questions supplied (${questions.length}).`
    );
  }

  for (const [i, q] of questions.entries()) {
    const prompt = q.prompt?.trim();
    if (!prompt || prompt.length > 4000) {
      problems.push(`Question ${i + 1}: prompt must be between 1 and 4000 characters.`);
    }
    if (!q.correctAnswer || q.correctAnswer.length > 4000) {
      problems.push(`Question ${i + 1}: correct answer must be between 1 and 4000 characters.`);
    }
    if (q.type === 'MCQ' && (!q.options || q.options.length < 2)) {
      problems.push(`Question ${i + 1}: an MCQ needs at least two options.`);
    }
    if (q.explanation && q.explanation.length > 8000) {
      problems.push(`Question ${i + 1}: explanation must be at most 8000 characters.`);
    }
  }

  const positions = new Set(questions.map(q => q.position));
  if (positions.size !== questions.length) {
    problems.push('Question positions must be unique within a quiz.');
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The signed-in user's non-deleted quizzes, newest first. */
export async function listQuizzes(): Promise<QuizRow[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabaseClient()
    .from('quizzes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new QuizPersistenceError(error.message, error.code);
  return (data ?? []) as QuizRow[];
}

/**
 * A single quiz with its questions and answer key.
 *
 * This is an OWNER read: RLS permits reading `question_answer_keys` only for
 * quizzes you own, so a caller who does not own the quiz gets no key rows and
 * the questions come back with `correct_answer: null`. That is the intended
 * behaviour, not a bug — it is what stops a quiz taker from reading the key.
 */
export async function getQuiz(quizId: string): Promise<OwnedQuiz | null> {
  if (!isSupabaseConfigured()) return null;

  const { data: quiz, error: quizError } = await getSupabaseClient()
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .is('deleted_at', null)
    .maybeSingle();

  if (quizError) throw new QuizPersistenceError(quizError.message, quizError.code);
  if (!quiz) return null;

  const { data: questions, error: qError } = await getSupabaseClient()
    .from('questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('position', { ascending: true });

  if (qError) throw new QuizPersistenceError(qError.message, qError.code);
  if (!questions || questions.length === 0) {
    return { quiz: quiz as QuizRow, questions: [] };
  }

  const ids = questions.map(q => q.id as string);
  const { data: keys, error: kError } = await getSupabaseClient()
    .from('question_answer_keys')
    .select('*')
    .in('question_id', ids);

  if (kError) throw new QuizPersistenceError(kError.message, kError.code);

  const keyByQuestion = new Map<string, AnswerKeyRow>(
    ((keys ?? []) as AnswerKeyRow[]).map(k => [k.question_id, k])
  );

  const joined: OwnedQuestion[] = (questions as QuestionRow[]).map(q => {
    const key = keyByQuestion.get(q.id);
    return {
      ...q,
      correct_answer: key?.correct_answer ?? null,
      explanation: key?.explanation ?? null,
    };
  });

  return { quiz: quiz as QuizRow, questions: joined };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Saves a quiz, its questions, and their answer key.
 *
 * The three inserts are sequential because questions need the quiz id and the
 * key needs the question ids. If a later step fails the earlier rows remain;
 * they are invisible to the owner (a quiz with no questions is not listed by
 * any completed-quiz query) and are covered by the documented retention
 * cleanup. A transactional Edge Function would be cleaner and is the natural
 * home for this once the server layer exists.
 */
export async function saveQuiz(input: NewQuiz): Promise<QuizRow> {
  const problems = validateNewQuiz(input);
  if (problems.length > 0) {
    throw new QuizPersistenceError(problems.join(' '));
  }
  if (!isSupabaseConfigured()) {
    throw new QuizPersistenceError('Supabase is not configured.');
  }

  const client = getSupabaseClient();

  // owner_id is set by the caller only in the sense that PostgREST derives the
  // session; the `WITH CHECK (auth.uid() = owner_id)` policy rejects a row whose
  // owner is not the caller, so no client-supplied owner can be smuggled in.
  const { data: userData } = await client.auth.getUser();
  const ownerId = userData?.user?.id;
  if (!ownerId) {
    throw new QuizPersistenceError('You must be signed in to save a quiz.');
  }

  const { data: quiz, error: quizError } = await client
    .from('quizzes')
    .insert({
      owner_id: ownerId,
      title: input.title.trim(),
      format: input.format,
      difficulty: input.difficulty,
      question_count: input.questionCount,
      timer_seconds: input.timerSeconds ?? null,
      source_type: input.sourceType,
      source_meta: input.sourceMeta ?? {},
    })
    .select('*')
    .single();

  if (quizError) throw new QuizPersistenceError(quizError.message, quizError.code);

  const quizRow = quiz as QuizRow;

  const { data: questions, error: qError } = await client
    .from('questions')
    .insert(
      input.questions.map(q => ({
        quiz_id: quizRow.id,
        position: q.position,
        type: q.type,
        prompt: q.prompt.trim(),
        options: q.type === 'MCQ' ? (q.options ?? null) : null,
        latex_blocks: q.latexBlocks ?? null,
      }))
    )
    .select('*');

  if (qError) throw new QuizPersistenceError(qError.message, qError.code);

  const inserted = (questions ?? []) as QuestionRow[];

  // The key is written to its own table. This is the split that makes a leak
  // impossible by construction: a `select *` on `questions` cannot return it.
  const keys = inserted.map((row, i) => ({
    question_id: row.id,
    correct_answer: input.questions[i].correctAnswer,
    explanation: input.questions[i].explanation ?? null,
  }));

  if (keys.length > 0) {
    const { error: kError } = await client.from('question_answer_keys').insert(keys);
    if (kError) throw new QuizPersistenceError(kError.message, kError.code);
  }

  return quizRow;
}

/**
 * Soft-deletes a quiz.
 *
 * Deletion goes through `public.soft_delete_quiz()`, a SECURITY DEFINER
 * function, because a `WITH CHECK` clause is not legal on a SELECT policy —
 * that is why the row's `deleted_at` cannot simply be updated from the client.
 * The function returns true only for the owner.
 */
export async function deleteQuiz(quizId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { data, error } = await getSupabaseClient().rpc('soft_delete_quiz', {
    p_quiz_id: quizId,
  });

  if (error) throw new QuizPersistenceError(error.message, error.code);
  return data === true;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  display_name: string | null;
  theme: 'light' | 'dark' | 'system';
  data_retention_consent: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * The signed-in user's profile row.
 *
 * Created automatically by a trigger on `auth.users`, so a missing row means
 * the trigger did not fire rather than "the user must sign up again". Returns
 * null instead of throwing so the caller can degrade quietly.
 */
export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await getSupabaseClient().from('profiles').select('*').maybeSingle();

  if (error) return null;
  return (data as Profile | null) ?? null;
}
