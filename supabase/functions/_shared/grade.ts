/**
 * Server-side grading for shared quizzes.
 *
 * Grading happens HERE, never in the client, for two independent reasons:
 *
 *   1. **Correctness.** The client is never given the answer key before
 *      submission, so it cannot grade itself even if it wanted to.
 *   2. **Security.** A client-side grade requires shipping the key to the
 *      browser, where anyone can read it from the bundle or the network tab.
 *      That would defeat the entire answer-key separation in the schema.
 *
 * The caller passes in the questions AND the key rows together, because this
 * function runs under service_role on the server. It is the only place allowed
 * to see both.
 *
 * Theory questions are NOT auto-graded. Awarding a score to free text requires
 * judgement this function does not have, so they are returned as ungraded with
 * `correct: null`, and the attempt stays `submitted` rather than `graded`.
 * Inventing a score would be worse than admitting we do not know.
 */

export interface GradableQuestion {
  id: string;
  type: 'MCQ' | 'theory';
  prompt: string;
  options: string[] | null;
}

export interface QuestionKey {
  question_id: string;
  correct_answer: string;
  explanation: string | null;
}

/** Rejection reasons, safe to return to the caller. */
export type ValidationResult =
  { ok: true; answers: Record<string, string> } | { ok: false; reason: string };

export const MAX_THEORY_LENGTH = 4000;
export const MAX_ANSWERS = 50;

/**
 * Validates a submitted answers map against the real question set.
 *
 * Unknown question ids are REJECTED rather than ignored. Silently dropping
 * them would let a caller submit answers for questions that do not exist and
 * receive a clean score, and would mask client bugs.
 */
export function validateAnswers(raw: unknown, questions: GradableQuestion[]): ValidationResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: '`answers` must be an object mapping question id to answer.' };
  }

  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0) {
    return { ok: false, reason: '`answers` is empty.' };
  }
  if (entries.length > MAX_ANSWERS) {
    return { ok: false, reason: `At most ${MAX_ANSWERS} answers may be submitted.` };
  }

  const byId = new Map(questions.map(q => [q.id, q]));
  const answers: Record<string, string> = {};

  for (const [questionId, value] of entries) {
    const question = byId.get(questionId);
    if (!question) {
      return {
        ok: false,
        reason: 'One or more answers refer to a question that is not in this quiz.',
      };
    }

    if (typeof value !== 'string') {
      return { ok: false, reason: 'Each answer must be a string.' };
    }

    if (question.type === 'MCQ') {
      // The submitted value must be one of the options we are about to show
      // the taker. Without this check a caller could submit arbitrary text and
      // still be scored.
      const options = question.options ?? [];
      if (!options.includes(value)) {
        return { ok: false, reason: 'One or more answers are not among the available options.' };
      }
    } else {
      if (value.length > MAX_THEORY_LENGTH) {
        return {
          ok: false,
          reason: `Theory answers are limited to ${MAX_THEORY_LENGTH} characters.`,
        };
      }
    }

    answers[questionId] = value;
  }

  return { ok: true, answers };
}

export interface PerQuestionResult {
  id: string;
  /** true / false for MCQ; null for theory, which is not auto-graded. */
  correct: boolean | null;
  /** Only revealed here, after submission. */
  correctAnswer: string;
  explanation: string | null;
  givenAnswer: string | null;
}

export interface GradeOutcome {
  score: number;
  total: number;
  /** True when every question could be auto-graded. */
  fullyGraded: boolean;
  perQuestion: PerQuestionResult[];
  /** Rows ready to insert into attempt_answers. */
  answerRows: {
    question_id: string;
    response: { value: string };
    is_correct: boolean | null;
    points_awarded: number | null;
    graded_at: string | null;
  }[];
}

/**
 * Grades a submission against the answer key.
 *
 * `score` counts auto-gradable (MCQ) questions only, and `total` is the number
 * of questions. Reporting "3 / 10" when seven are awaiting human marking would
 * misrepresent the result, so `fullyGraded` is returned alongside and the
 * caller decides how to present it.
 */
export function gradeSubmission(
  questions: GradableQuestion[],
  keys: QuestionKey[],
  answers: Record<string, string>,
  now: Date = new Date()
): GradeOutcome {
  const keyById = new Map(keys.map(k => [k.question_id, k]));
  const perQuestion: PerQuestionResult[] = [];
  const answerRows: GradeOutcome['answerRows'] = [];

  let score = 0;
  let autoGradable = 0;
  let allAutoGraded = true;

  for (const question of questions) {
    const key = keyById.get(question.id);
    const given = answers[question.id] ?? null;

    // A question with no key row cannot be graded. Treat it as ungraded rather
    // than as wrong, so a data problem never costs a user points.
    if (!key) {
      allAutoGraded = false;
      perQuestion.push({
        id: question.id,
        correct: null,
        correctAnswer: '',
        explanation: null,
        givenAnswer: given,
      });
      answerRows.push({
        question_id: question.id,
        response: { value: given ?? '' },
        is_correct: null,
        points_awarded: null,
        graded_at: null,
      });
      continue;
    }

    if (question.type === 'MCQ') {
      autoGradable += 1;
      const correct = given !== null && normalise(given) === normalise(key.correct_answer);
      if (correct) score += 1;
      perQuestion.push({
        id: question.id,
        correct,
        correctAnswer: key.correct_answer,
        explanation: key.explanation ?? null,
        givenAnswer: given,
      });
      answerRows.push({
        question_id: question.id,
        response: { value: given ?? '' },
        is_correct: correct,
        points_awarded: correct ? 1 : 0,
        graded_at: now.toISOString(),
      });
      continue;
    }

    // Theory: recorded, not auto-graded.
    allAutoGraded = false;
    perQuestion.push({
      id: question.id,
      correct: null,
      correctAnswer: key.correct_answer,
      explanation: key.explanation ?? null,
      givenAnswer: given,
    });
    answerRows.push({
      question_id: question.id,
      response: { value: given ?? '' },
      is_correct: null,
      points_awarded: null,
      graded_at: null,
    });
  }

  return {
    score,
    total: questions.length,
    fullyGraded: allAutoGraded && autoGradable === questions.length && questions.length > 0,
    perQuestion,
    answerRows,
  };
}

/**
 * Case- and whitespace-insensitive comparison.
 *
 * MCQ answers are chosen from a fixed option list, so a user who types the
 * option by hand, or whose client trims differently, should still be marked
 * correctly. This compares the user's selection against the stored answer, not
 * against free text, so the looseness cannot be exploited to guess an answer.
 */
function normalise(value: string): string {
  return value.trim().toLowerCase();
}
