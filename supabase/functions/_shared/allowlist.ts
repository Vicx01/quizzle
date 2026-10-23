/**
 * Response shaping for shared quizzes.
 *
 * Every payload is built from an explicit ALLOWLIST: fields are copied in by
 * name, never inherited by spreading a database row.
 *
 * This is the whole reason sharing is server-mediated. A quiz row and its
 * questions carry the answer key, the owner's identity and the source
 * metadata. A denylist — "take the row and delete the sensitive keys" —
 * leaks every field added to the table later, silently and by default.
 * Building up means a new column is invisible until someone deliberately
 * publishes it.
 */

export interface QuizSourceRow {
  id: string;
  title: string;
  format: string;
  difficulty: string;
  question_count: number;
  timer_seconds: number | null;
  deleted_at?: string | null;
}

export interface QuestionSourceRow {
  id: string;
  position: number;
  type: 'MCQ' | 'theory';
  prompt: string;
  options: string[] | null;
  latex_blocks: string[] | null;
}

/**
 * The quiz as a taker may see it.
 *
 * Note the absence of: source_type, source_meta, owner_id, created_at,
 * updated_at, and above all correct_answer and explanation. Those exist on the
 * rows we read; they are simply never copied out.
 */
export interface SharedQuizPayload {
  quizId: string;
  title: string;
  format: string;
  difficulty: string;
  questionCount: number;
  timerSeconds: number | null;
  questions: {
    id: string;
    type: 'MCQ' | 'theory';
    prompt: string;
    options: string[] | null;
    latexBlocks: string[] | null;
  }[];
}

export function buildSharedQuiz(
  quiz: QuizSourceRow,
  questions: QuestionSourceRow[]
): SharedQuizPayload {
  return {
    quizId: quiz.id,
    title: quiz.title,
    format: quiz.format,
    difficulty: quiz.difficulty,
    questionCount: quiz.question_count,
    timerSeconds: quiz.timer_seconds ?? null,
    questions: questions
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(q => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: q.options ?? null,
        latexBlocks: q.latex_blocks ?? null,
      })),
  };
}

/**
 * Confirms at runtime that a built payload contains no key-material.
 *
 * Belt and braces: `buildSharedQuiz` is written correctly, but a future edit
 * could add a field. This fails loudly in tests and in the function rather
 * than shipping the answer key to a quiz taker.
 */
export function assertNoAnswerKey(payload: unknown): void {
  const serialised = JSON.stringify(payload ?? '');
  const forbidden = ['correct_answer', 'correctAnswer', 'explanation', 'owner_id', 'source_meta'];
  for (const field of forbidden) {
    if (serialised.includes(field)) {
      throw new Error(`Shared quiz payload leaked a forbidden field: ${field}`);
    }
  }
}
