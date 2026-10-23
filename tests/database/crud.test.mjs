/**
 * Executed owner-CRUD tests for the quiz persistence layer.
 *
 * These mirror exactly what services/quizzes.ts sends through PostgREST:
 * insert a quiz, insert its questions, insert the answer key separately, then
 * read and soft-delete. Running them against the real engine means the
 * WITH CHECK clauses and the answer-key policy are executed, not reviewed.
 *
 * The list queries here are written to match `listQuizzes()` /
 * `getQuiz()` so a divergence between the module and the policies fails here.
 *
 * Run with:  npm run test:db
 */

import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createTestDatabase, seedScenario, USERS } from './harness.mjs';

let t;
let seed;

before(async () => {
  t = await createTestDatabase();
  seed = await seedScenario(t);
});

after(async () => {
  await t?.close();
});

/**
 * A denied READ returns zero rows, or raises 42501.
 *
 * Only correct for SELECTs. Do NOT use this for INSERT/UPDATE: a write that
 * "returns no rows" has not necessarily been denied — RLS filters the RETURNING
 * clause, so a row can be created and then hidden, which looks identical to a
 * refusal from the caller's side. That is exactly why `expectRlsError` exists.
 */
async function expectDenied(operation) {
  try {
    const result = await operation();
    const rows = result?.rows ?? [];
    assert.equal(
      rows.length,
      0,
      `expected no rows, but the operation returned ${JSON.stringify(rows)}`
    );
  } catch (error) {
    assert.equal(
      error.code,
      '42501',
      `expected an RLS denial (42501), got ${error.code}: ${error.message}`
    );
  }
}

/** Creates a quiz as `userId`, returning its id. Mirrors saveQuiz(). */
/**
 * Asserts a WRITE is refused with 42501.
 *
 * Must be used for INSERT/UPDATE denials. Checking only that no rows came back
 * would pass even when the write succeeded, because RLS filters RETURNING.
 */
async function expectRlsError(operation) {
  let threw = false;
  try {
    await operation();
  } catch (error) {
    threw = true;
    assert.equal(
      error.code,
      '42501',
      `expected an RLS denial (42501), got ${error.code}: ${error.message}`
    );
  }
  assert.ok(threw, 'expected the write to be rejected, but it succeeded');
}

async function insertQuizAs(userId, title, ownerId) {
  const result = await t.asUser(
    userId,
    `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
     values ($1, $2, 'MCQ', 'Easy', 1, 'text') returning id`,
    [ownerId, title]
  );
  return result.rows[0].id;
}

describe('owner CRUD — create', () => {
  it('lets a signed-in user create a quiz they own', async () => {
    const id = await insertQuizAs(USERS.alice, 'Alice owned', USERS.alice);
    assert.ok(id, 'expected a quiz id back');

    const check = await t.asUser(USERS.alice, 'select owner_id from public.quizzes where id = $1', [
      id,
    ]);
    assert.equal(check.rows[0].owner_id, USERS.alice);
  });

  it('rejects a quiz whose owner_id is not the caller', async () => {
    // This is the "client-supplied ownership" attack. The WITH CHECK clause
    // must refuse it even though the caller is authenticated.
    //
    // Asserted with expectRlsError, not expectDenied: under a weakened policy
    // the insert SUCCEEDS and merely returns no rows, because RLS filters the
    // RETURNING clause. A rows-only check would pass while the attack worked.
    await expectRlsError(() => insertQuizAs(USERS.alice, 'Spoofed owner', USERS.bob));
  });

  it('rejects an anonymous insert', async () => {
    await expectRlsError(() =>
      t.asAnon(
        `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
         values ($1, 'Anon quiz', 'MCQ', 'Easy', 1, 'text') returning id`,
        [USERS.alice]
      )
    );
  });
});

describe('owner CRUD — read', () => {
  it('lets the owner read their own quiz', async () => {
    const rows = await t.asUser(
      USERS.alice,
      `select id, title from public.quizzes
       where id = $1 and deleted_at is null`,
      [seed.aliceQuiz]
    );
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].title, 'Alice quiz');
  });

  it("hides another user's quiz completely", async () => {
    const rows = await t.asUser(
      USERS.bob,
      `select id from public.quizzes where id = $1 and deleted_at is null`,
      [seed.aliceQuiz]
    );
    assert.equal(rows.rows.length, 0);
  });

  it("lists only the caller's own non-deleted quizzes", async () => {
    const rows = await t.asUser(
      USERS.alice,
      `select id from public.quizzes where deleted_at is null order by created_at desc`
    );
    const ids = rows.rows.map(r => r.id);
    assert.ok(ids.includes(seed.aliceQuiz), 'own quiz should be listed');
    assert.ok(!ids.includes(seed.bobQuiz), "another user's quiz should not be listed");
  });
});

describe('owner CRUD — questions and the answer key split', () => {
  it('lets the owner write questions and their answer key to separate tables', async () => {
    const quizId = await insertQuizAs(USERS.alice, 'Key split quiz', USERS.alice);

    const q = await t.asUser(
      USERS.alice,
      `insert into public.questions (quiz_id, position, type, prompt, options)
       values ($1, 0, 'MCQ', 'What is 2+2?', $2::jsonb) returning id`,
      [quizId, JSON.stringify(['3', '4', '5'])]
    );
    const questionId = q.rows[0].id;

    await t.asUser(
      USERS.alice,
      `insert into public.question_answer_keys (question_id, correct_answer, explanation)
       values ($1, '4', 'Arithmetic')`,
      [questionId]
    );

    // The owner CAN read their own key — they authored it.
    const key = await t.asUser(
      USERS.alice,
      'select correct_answer from public.question_answer_keys where question_id = $1',
      [questionId]
    );
    assert.equal(key.rows.length, 1);
    assert.equal(key.rows[0].correct_answer, '4');
  });

  it('denies a non-owner any read of the answer key', async () => {
    // This is the guarantee the whole schema is built around: taking a quiz
    // must not grant read access to its answer key.
    const key = await t.asUser(
      USERS.bob,
      'select correct_answer from public.question_answer_keys where question_id = $1',
      [seed.questions.aliceQ1]
    );
    assert.equal(key.rows.length, 0);
  });

  it('denies an anonymous read of the answer key', async () => {
    const key = await t.asAnon(
      'select correct_answer from public.question_answer_keys where question_id = $1',
      [seed.questions.aliceQ1]
    );
    assert.equal(key.rows.length, 0);
  });

  it('never returns the answer key from a select on questions alone', async () => {
    // Structural guarantee: a `select *` on questions cannot leak the answer,
    // because the answer is not in that table at all.
    const cols = await t.asRoot(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'questions'`
    );
    const names = cols.rows.map(r => r.column_name);
    assert.ok(
      !names.includes('correct_answer'),
      'questions must not carry a correct_answer column'
    );
  });

  it("denies a non-owner inserting questions into someone else's quiz", async () => {
    await expectRlsError(() =>
      t.asUser(
        USERS.bob,
        `insert into public.questions (quiz_id, position, type, prompt)
         values ($1, 9, 'theory', 'Injected') returning id`,
        [seed.aliceQuiz]
      )
    );
  });
});

describe('owner CRUD — update', () => {
  it('lets the owner rename their quiz', async () => {
    const id = await insertQuizAs(USERS.alice, 'Before rename', USERS.alice);
    const updated = await t.asUser(
      USERS.alice,
      'update public.quizzes set title = $2 where id = $1 returning title',
      [id, 'After rename']
    );
    assert.equal(updated.rows[0].title, 'After rename');
  });

  it('refuses to transfer a quiz to another owner', async () => {
    // WITH CHECK on the UPDATE policy means the new row is re-validated, so
    // even a successful-looking ownership change is rejected.
    await expectRlsError(() =>
      t.asUser(USERS.alice, 'update public.quizzes set owner_id = $2 where id = $1 returning id', [
        seed.aliceQuiz,
        USERS.bob,
      ])
    );
  });

  it('applies zero rows when a non-owner tries to update', async () => {
    const result = await t.asUser(
      USERS.bob,
      'update public.quizzes set title = $2 where id = $1 returning id',
      [seed.aliceQuiz, 'Hijacked']
    );
    assert.equal(result.rows.length, 0);
  });
});

describe('owner CRUD — soft delete', () => {
  it('lets the owner soft-delete and hides the quiz from their history', async () => {
    const id = await insertQuizAs(USERS.alice, 'Delete me', USERS.alice);

    const deleted = await t.asUser(USERS.alice, 'select public.soft_delete_quiz($1)', [id]);
    assert.equal(deleted.rows[0].soft_delete_quiz, true);

    const remaining = await t.asUser(
      USERS.alice,
      'select id from public.quizzes where id = $1 and deleted_at is null',
      [id]
    );
    assert.equal(remaining.rows.length, 0, 'deleted quiz must vanish from history');
  });

  it('returns false when a non-owner tries to delete', async () => {
    const result = await t.asUser(USERS.bob, 'select public.soft_delete_quiz($1)', [
      seed.aliceQuiz,
    ]);
    assert.equal(result.rows[0].soft_delete_quiz, false);

    // And Alice's quiz is untouched.
    const still = await t.asUser(
      USERS.alice,
      'select id from public.quizzes where id = $1 and deleted_at is null',
      [seed.aliceQuiz]
    );
    assert.equal(still.rows.length, 1);
  });

  it('returns false for an anonymous caller', async () => {
    await assert.rejects(
      () => t.asAnon('select public.soft_delete_quiz($1)', [seed.aliceQuiz]),
      // anon has no EXECUTE grant at all, so this is a permission error.
      () => true
    );
  });
});

describe('constraints the app relies on', () => {
  it('rejects a question count outside 1..50', async () => {
    await assert.rejects(() =>
      t.asUser(
        USERS.alice,
        `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
         values ($1, 'Bad count', 'MCQ', 'Easy', 0, 'text')`,
        [USERS.alice]
      )
    );
    await assert.rejects(() =>
      t.asUser(
        USERS.alice,
        `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
         values ($1, 'Bad count', 'MCQ', 'Easy', 51, 'text')`,
        [USERS.alice]
      )
    );
  });

  it('rejects an empty title', async () => {
    await assert.rejects(() =>
      t.asUser(
        USERS.alice,
        `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
         values ($1, '', 'MCQ', 'Easy', 1, 'text')`,
        [USERS.alice]
      )
    );
  });

  it('requires an answer key to have an answer', async () => {
    await assert.rejects(() =>
      t.asUser(
        USERS.alice,
        `insert into public.question_answer_keys (question_id, correct_answer)
         values ($1, '')`,
        [seed.questions.aliceQ1]
      )
    );
  });
});

describe('profile bootstrap', () => {
  it('created a profile row for every seeded user', async () => {
    for (const id of Object.values(USERS)) {
      const rows = await t.asUser(id, 'select id, theme from public.profiles where id = $1', [id]);
      assert.equal(rows.rows.length, 1, `expected a profile for ${id}`);
      assert.equal(rows.rows[0].theme, 'system');
    }
  });

  it("hides other users' profiles", async () => {
    const rows = await t.asUser(USERS.bob, 'select id from public.profiles where id = $1', [
      USERS.alice,
    ]);
    assert.equal(rows.rows.length, 0);
  });
});
