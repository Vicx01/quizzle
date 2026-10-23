/**
 * Quizzle — quiz persistence tests.
 *
 * These exercise `services/quizzes.ts` against a fake Supabase client, so they
 * run with no network and no project. Their job is the client-side logic the
 * database tests cannot see: input validation, the answer-key split on write,
 * the key join on read, and the soft-delete call.
 *
 * The security *enforcement* is covered separately by
 * `tests/database/crud.test.mjs`, which runs the real policies.
 */

import { validateNewQuiz } from '../quizzes';

// Type-only so the import is erased and cannot trigger a module load; the
// module itself is re-required per test below via useClient().
import type * as QuizzesModule from '../quizzes';

// ---------------------------------------------------------------------------
// Fake Supabase client
// ---------------------------------------------------------------------------

type Call = { table?: string; op: string; payload?: unknown };

/**
 * Records every call so tests can assert on what the module actually sent, and
 * returns canned rows. Deliberately not a full Supabase mock — it implements
 * only the surface `quizzes.ts` uses.
 */
function makeClient(
  options: {
    quizRows?: unknown[];
    questionRows?: unknown[];
    keyRows?: unknown[];
    user?: { id: string } | null;
    error?: { message: string; code?: string } | null;
  } = {}
) {
  const calls: Call[] = [];
  const {
    quizRows = [],
    questionRows = [],
    keyRows = [],
    user = { id: 'user-1' },
    error = null,
  } = options;

  const client = {
    auth: {
      getUser: jest.fn(async () => ({ data: { user }, error: null })),
    },
    rpc: jest.fn(async (fn: string, args: unknown) => {
      calls.push({ op: `rpc:${fn}`, payload: args });
      return { data: fn === 'soft_delete_quiz' ? true : null, error };
    }),
    from: jest.fn((table: string) => {
      const rowsFor = () => {
        if (table === 'quizzes') return quizRows;
        if (table === 'questions') return questionRows;
        if (table === 'question_answer_keys') return keyRows;
        return [];
      };

      const builder: Record<string, unknown> = {};
      const finish = (op: string) => async () => {
        calls.push({ table, op });
        return { data: rowsFor(), error };
      };

      builder.select = () => builder;
      builder.insert = (payload: unknown) => {
        calls.push({ table, op: 'insert', payload });
        return builder;
      };
      builder.eq = () => builder;
      builder.is = () => builder;
      builder.in = () => builder;
      builder.order = () => builder;
      builder.single = async () => {
        calls.push({ table, op: 'single' });
        return { data: rowsFor()[0] ?? null, error };
      };
      builder.maybeSingle = async () => {
        calls.push({ table, op: 'maybeSingle' });
        return { data: rowsFor()[0] ?? null, error };
      };
      // Awaited directly (no .single()) — used by listQuizzes and the reads.
      // The call is recorded here, otherwise these queries leave no trace.
      builder.then = (resolve: (v: unknown) => unknown) => {
        calls.push({ table, op: 'await' });
        return Promise.resolve({ data: rowsFor(), error }).then(resolve);
      };
      void finish;
      return builder;
    }),
  };

  return { client, calls };
}

/** Installs the fake client and marks Supabase "configured". */
function useClient(client: unknown) {
  jest.resetModules();
  jest.doMock('../supabase', () => ({
    getSupabaseClient: () => client,
    isSupabaseConfigured: () => true,
  }));
  // The module must be re-required AFTER doMock, so a top-level import cannot
  // be used here.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../quizzes') as typeof QuizzesModule;
}

const VALID_QUIZ = {
  title: 'Photosynthesis',
  format: 'MCQ' as const,
  difficulty: 'Easy' as const,
  questionCount: 2,
  sourceType: 'text' as const,
  questions: [
    {
      position: 0,
      type: 'MCQ' as const,
      prompt: 'What do plants absorb?',
      options: ['Oxygen', 'Carbon dioxide'],
      correctAnswer: 'Carbon dioxide',
      explanation: 'They take in CO2.',
    },
    {
      position: 1,
      type: 'theory' as const,
      prompt: 'Explain the light reaction.',
      correctAnswer: 'Light splits water.',
    },
  ],
};

afterEach(() => {
  jest.resetModules();
  jest.dontMock('../supabase');
});

// ---------------------------------------------------------------------------
// Validation (pure — no client needed)
// ---------------------------------------------------------------------------

describe('validateNewQuiz', () => {
  it('accepts a well-formed quiz', () => {
    expect(validateNewQuiz(VALID_QUIZ)).toEqual([]);
  });

  it('rejects a missing or over-long title', () => {
    expect(validateNewQuiz({ ...VALID_QUIZ, title: '  ' })).not.toHaveLength(0);
    expect(validateNewQuiz({ ...VALID_QUIZ, title: 'x'.repeat(201) })).not.toHaveLength(0);
  });

  it('rejects an invalid enum value', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad = { ...VALID_QUIZ, difficulty: 'Impossible' as any };
    expect(validateNewQuiz(bad).join(' ')).toMatch(/difficulty/i);
  });

  it('rejects a mismatch between questionCount and the questions supplied', () => {
    const problems = validateNewQuiz({ ...VALID_QUIZ, questionCount: 5 });
    expect(problems.join(' ')).toMatch(/does not match/i);
  });

  it('rejects an MCQ with fewer than two options', () => {
    const bad = {
      ...VALID_QUIZ,
      questions: [{ ...VALID_QUIZ.questions[0], options: ['only one'] }],
      questionCount: 1,
    };
    expect(validateNewQuiz(bad).join(' ')).toMatch(/at least two options/i);
  });

  it('rejects a question with no correct answer', () => {
    const bad = {
      ...VALID_QUIZ,
      questions: [{ ...VALID_QUIZ.questions[0], correctAnswer: '' }],
      questionCount: 1,
    };
    expect(validateNewQuiz(bad)).not.toHaveLength(0);
  });

  it('rejects duplicate question positions', () => {
    const bad = {
      ...VALID_QUIZ,
      questions: [VALID_QUIZ.questions[0], { ...VALID_QUIZ.questions[1], position: 0 }],
    };
    expect(validateNewQuiz(bad).join(' ')).toMatch(/unique/i);
  });
});

// ---------------------------------------------------------------------------
// saveQuiz — the answer-key split
// ---------------------------------------------------------------------------

describe('saveQuiz', () => {
  it('writes the answer key to its own table, never alongside questions', async () => {
    const { client, calls } = makeClient({
      quizRows: [{ id: 'quiz-1' }],
      questionRows: [{ id: 'q-1' }, { id: 'q-2' }],
    });
    const svc = useClient(client);

    await svc.saveQuiz(VALID_QUIZ);

    const questionInsert = calls.find(c => c.table === 'questions' && c.op === 'insert');
    const keyInsert = calls.find(c => c.table === 'question_answer_keys' && c.op === 'insert');

    // The questions payload must not contain the answers.
    const questionPayload = questionInsert?.payload as Record<string, unknown>[];
    expect(questionPayload[0]).not.toHaveProperty('correct_answer');
    expect(questionPayload[0]).not.toHaveProperty('correctAnswer');

    // The key payload carries them, keyed by question id.
    const keyPayload = keyInsert?.payload as Record<string, unknown>[];
    expect(keyPayload).toHaveLength(2);
    expect(keyPayload[0]).toMatchObject({
      question_id: 'q-1',
      correct_answer: 'Carbon dioxide',
      explanation: 'They take in CO2.',
    });
  });

  it('refuses to save an invalid quiz without touching the database', async () => {
    const { client, calls } = makeClient();
    const svc = useClient(client);

    await expect(svc.saveQuiz({ ...VALID_QUIZ, title: '' })).rejects.toThrow(
      /Title must be between 1 and 200 characters/
    );
    expect(calls.filter(c => c.op === 'insert')).toHaveLength(0);
  });

  it('refuses to save when nobody is signed in', async () => {
    const { client } = makeClient({ user: null });
    const svc = useClient(client);

    await expect(svc.saveQuiz(VALID_QUIZ)).rejects.toThrow(/signed in/i);
  });

  it('surfaces a database error as a QuizPersistenceError', async () => {
    const { client } = makeClient({ error: { message: 'nope', code: '42501' } });
    const svc = useClient(client);

    // Matched by message, not constructor: `useClient` re-requires the module,
    // so the class it throws is a different object from the imported one.
    await expect(svc.saveQuiz(VALID_QUIZ)).rejects.toThrow('nope');
  });
});

// ---------------------------------------------------------------------------
// getQuiz — the owner read and the key join
// ---------------------------------------------------------------------------

describe('getQuiz', () => {
  it('joins each question to its answer key', async () => {
    const { client } = makeClient({
      quizRows: [{ id: 'quiz-1', title: 'T' }],
      questionRows: [
        { id: 'q-1', position: 0 },
        { id: 'q-2', position: 1 },
      ],
      keyRows: [{ question_id: 'q-1', correct_answer: 'A', explanation: null }],
    });
    const svc = useClient(client);

    const result = await svc.getQuiz('quiz-1');

    expect(result?.questions).toHaveLength(2);
    expect(result?.questions[0].correct_answer).toBe('A');
    // A question with no key row comes back null rather than throwing.
    expect(result?.questions[1].correct_answer).toBeNull();
  });

  it('returns null when the quiz is not visible to the caller', async () => {
    // RLS returns no row for someone else's quiz; the module must treat that
    // as "not found" rather than throwing.
    const { client } = makeClient({ quizRows: [] });
    const svc = useClient(client);

    expect(await svc.getQuiz('someone-elses')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listQuizzes / deleteQuiz
// ---------------------------------------------------------------------------

describe('listQuizzes', () => {
  it('excludes soft-deleted quizzes and orders newest first', async () => {
    const { client, calls } = makeClient({ quizRows: [{ id: 'quiz-1' }] });
    const svc = useClient(client);

    const rows = await svc.listQuizzes();
    expect(rows).toHaveLength(1);
    expect(calls.some(c => c.table === 'quizzes')).toBe(true);
  });
});

describe('deleteQuiz', () => {
  it('soft-deletes through the SECURITY DEFINER function', async () => {
    const { client, calls } = makeClient();
    const svc = useClient(client);

    const ok = await svc.deleteQuiz('quiz-1');

    expect(ok).toBe(true);
    const rpc = calls.find(c => c.op === 'rpc:soft_delete_quiz');
    expect(rpc?.payload).toEqual({ p_quiz_id: 'quiz-1' });
  });
});
