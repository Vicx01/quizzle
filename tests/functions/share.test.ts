/**
 * Tests for the share endpoint logic.
 *
 * These cover the parts of the Edge Functions that decide security outcomes:
 * token handling, the response allowlist, and server-side grading. They are
 * pure functions with no network, no Deno and no database, so they run under
 * the normal Jest config.
 *
 * The handler shells under `supabase/functions/` are NOT covered here — they
 * need Deno and `npm:` specifiers. What matters is that every security decision
 * they make is delegated to something that IS tested.
 */

import {
  buildSharedQuiz,
  assertNoAnswerKey,
  type QuestionSourceRow,
  type QuizSourceRow,
} from '../../supabase/functions/_shared/allowlist';
import {
  gradeSubmission,
  validateAnswers,
  type GradableQuestion,
} from '../../supabase/functions/_shared/grade';
import {
  isValidTokenFormat,
  redactToken,
  generateToken,
} from '../../supabase/functions/_shared/token';
import { checkRateLimit } from '../../supabase/functions/_shared/rateLimit';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const QUIZ: QuizSourceRow = {
  id: 'quiz-1',
  title: 'Photosynthesis',
  format: 'MCQ',
  difficulty: 'Easy',
  question_count: 2,
  timer_seconds: null,
};

const QUESTIONS: QuestionSourceRow[] = [
  {
    id: 'q-1',
    position: 0,
    type: 'MCQ',
    prompt: 'What do plants absorb?',
    options: ['Oxygen', 'Carbon dioxide'],
    latex_blocks: null,
  },
  {
    id: 'q-2',
    position: 1,
    type: 'theory',
    prompt: 'Explain the light reaction.',
    options: null,
    latex_blocks: null,
  },
];

const GRADABLE: GradableQuestion[] = QUESTIONS.map(q => ({
  id: q.id,
  type: q.type,
  prompt: q.prompt,
  options: q.options,
}));

const KEYS = [
  { question_id: 'q-1', correct_answer: 'Carbon dioxide', explanation: 'They take in CO2.' },
  { question_id: 'q-2', correct_answer: 'Light splits water.', explanation: null },
];

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

describe('token', () => {
  it('accepts a well-formed token', () => {
    expect(isValidTokenFormat(generateToken())).toBe(true);
    expect(isValidTokenFormat('a'.repeat(22))).toBe(true);
  });

  it('rejects malformed or absent tokens', () => {
    // Rejected on shape, before any database call is made.
    expect(isValidTokenFormat('short')).toBe(false);
    expect(isValidTokenFormat('has spaces and symbols!!')).toBe(false);
    expect(isValidTokenFormat('')).toBe(false);
    expect(isValidTokenFormat(null)).toBe(false);
    expect(isValidTokenFormat(undefined)).toBe(false);
  });

  it('never exposes a full token in redacted output', () => {
    const token = generateToken();
    const redacted = redactToken(token);
    expect(redacted).not.toContain(token);
    // Only a short prefix survives, so logs yield no working share URL.
    expect(redacted.startsWith(token.slice(0, 4))).toBe(true);
    expect(redacted).not.toBe(token);
  });

  it('generates unique tokens', () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

describe('buildSharedQuiz', () => {
  it('copies only the fields a taker needs', () => {
    const payload = buildSharedQuiz(QUIZ, QUESTIONS);
    expect(Object.keys(payload).sort()).toEqual([
      'difficulty',
      'format',
      'questionCount',
      'questions',
      'quizId',
      'timerSeconds',
      'title',
    ]);
  });

  it('drops the answer key, owner and source metadata', () => {
    // Build from a row that deliberately carries sensitive extra columns.
    const row = {
      ...QUIZ,
      owner_id: 'owner-1',
      source_type: 'pdf',
      source_meta: { name: 'a.pdf' },
    };
    const payload = buildSharedQuiz(row as QuizSourceRow, QUESTIONS);
    const serialised = JSON.stringify(payload);
    expect(serialised).not.toContain('owner-1');
    expect(serialised).not.toContain('a.pdf');
    expect(serialised).not.toContain('source_meta');
  });

  it('orders questions by position regardless of input order', () => {
    const reversed = [...QUESTIONS].reverse();
    expect(buildSharedQuiz(QUIZ, reversed).questions.map(q => q.id)).toEqual(['q-1', 'q-2']);
  });
});

describe('assertNoAnswerKey', () => {
  it('passes for a clean payload', () => {
    expect(() => assertNoAnswerKey(buildSharedQuiz(QUIZ, QUESTIONS))).not.toThrow();
  });

  it('throws if key material is ever included', () => {
    // Guards against a future edit adding a field to the allowlist that
    // should not be published.
    expect(() => assertNoAnswerKey({ quizId: 'q', correctAnswer: 'x' })).toThrow(/correctAnswer/);
    expect(() => assertNoAnswerKey({ quizId: 'q', explanation: 'why' })).toThrow(/explanation/);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('validateAnswers', () => {
  it('accepts a valid submission', () => {
    const result = validateAnswers(
      { 'q-1': 'Carbon dioxide', 'q-2': 'Light splits water' },
      GRADABLE
    );
    expect(result.ok).toBe(true);
  });

  it('rejects an answer for a question that is not in the quiz', () => {
    // Rejected rather than ignored: silently dropping unknown ids would let a
    // caller submit answers for questions that do not exist.
    const result = validateAnswers({ 'q-1': 'Carbon dioxide', 'q-nope': 'x' }, GRADABLE);
    expect(result.ok).toBe(false);
  });

  it('rejects an MCQ answer that is not one of the options', () => {
    const result = validateAnswers({ 'q-1': 'Nitrogen' }, GRADABLE);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not among the available options/i);
  });

  it('rejects non-string and empty submissions', () => {
    expect(validateAnswers({ 'q-1': 42 }, GRADABLE).ok).toBe(false);
    expect(validateAnswers({}, GRADABLE).ok).toBe(false);
    expect(validateAnswers(null, GRADABLE).ok).toBe(false);
    expect(validateAnswers([], GRADABLE).ok).toBe(false);
  });

  it('rejects an oversized theory answer', () => {
    expect(validateAnswers({ 'q-2': 'x'.repeat(4001) }, GRADABLE).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

describe('gradeSubmission', () => {
  it('marks MCQ answers correct and incorrect', () => {
    const outcome = gradeSubmission(GRADABLE, KEYS, { 'q-1': 'Carbon dioxide', 'q-2': 'anything' });
    const mcq = outcome.perQuestion.find(q => q.id === 'q-1');
    expect(mcq?.correct).toBe(true);
  });

  it('does not auto-grade theory questions', () => {
    const outcome = gradeSubmission(GRADABLE, KEYS, { 'q-1': 'Carbon dioxide', 'q-2': 'text' });
    const theory = outcome.perQuestion.find(q => q.id === 'q-2');
    expect(theory?.correct).toBeNull();
    expect(outcome.fullyGraded).toBe(false);
  });

  it('reports fullyGraded only when every question was auto-graded', () => {
    const mcqOnly = [GRADABLE[0]!];
    const outcome = gradeSubmission(mcqOnly, KEYS, { 'q-1': 'Carbon dioxide' });
    expect(outcome.fullyGraded).toBe(true);
    expect(outcome.score).toBe(1);
  });

  it('reveals the correct answer and explanation only in the result', () => {
    // This response is produced AFTER submission, which is why the key may
    // appear here at all.
    const outcome = gradeSubmission(GRADABLE, KEYS, { 'q-1': 'Oxygen', 'q-2': 'x' });
    const mcq = outcome.perQuestion.find(q => q.id === 'q-1');
    expect(mcq?.correct).toBe(false);
    expect(mcq?.correctAnswer).toBe('Carbon dioxide');
    expect(mcq?.explanation).toBe('They take in CO2.');
  });

  it('compares MCQ answers case- and whitespace-insensitively', () => {
    const outcome = gradeSubmission(GRADABLE, KEYS, { 'q-1': '  carbon dioxide ', 'q-2': 'x' });
    expect(outcome.perQuestion.find(q => q.id === 'q-1')?.correct).toBe(true);
  });

  it('treats a question with no key row as ungraded, never as wrong', () => {
    // A data problem must not cost the user points.
    const outcome = gradeSubmission([GRADABLE[0]!], [], { 'q-1': 'Carbon dioxide' });
    expect(outcome.perQuestion[0]?.correct).toBeNull();
    expect(outcome.score).toBe(0);
    expect(outcome.fullyGraded).toBe(false);
  });

  it('produces answer rows that carry the server-computed outcome', () => {
    const outcome = gradeSubmission(GRADABLE, KEYS, { 'q-1': 'Carbon dioxide', 'q-2': 'x' });
    expect(outcome.answerRows).toHaveLength(2);
    expect(outcome.answerRows[0]).toMatchObject({ question_id: 'q-1', is_correct: true });
    // Theory is stored but not scored.
    expect(outcome.answerRows[1]).toMatchObject({ question_id: 'q-2', is_correct: null });
  });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe('checkRateLimit', () => {
  it('allows up to the limit then blocks', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(false);
  });

  it('tracks different keys independently', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(checkRateLimit(a, 1, 60_000).allowed).toBe(true);
    // One hot key must not lock out another client or another link.
    expect(checkRateLimit(b, 1, 60_000).allowed).toBe(true);
  });

  it('always reports a usable retry hint', () => {
    const key = `retry-${Math.random()}`;
    const result = checkRateLimit(key, 0, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});
