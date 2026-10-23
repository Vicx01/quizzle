/**
 * Executed Row Level Security tests.
 *
 * These run the real migrations against a real PostgreSQL engine and then
 * attempt the operations a client would attempt. A policy that is missing or
 * too permissive fails here — this is not a static review of the SQL.
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

/** A denied operation either returns zero rows or raises 42501. */
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
      `expected an RLS/permission denial (42501), got ${error.code}: ${error.message}`
    );
  }
}

async function expectRlsError(operation) {
  await assert.rejects(
    operation,
    error => error.code === '42501',
    'expected the write to be rejected by row level security'
  );
}

// ===========================================================================
// 0. Positive controls
//
// Every test below asserts that something returns NO rows. That assertion is
// only meaningful if the rows actually exist and RLS is what hides them.
// These controls prove the fixtures are populated and that the same query
// succeeds under service_role, so a broken seed or a dropped table cannot
// masquerade as a passing security test.
// ===========================================================================
describe('0. positive controls (the fixtures are really there)', () => {
  it('service_role can see every quiz', async () => {
    const r = await t.asService('select id from public.quizzes');
    assert.ok(r.rows.length >= 2, 'expected Alice and Bob quizzes to exist');
  });

  it('service_role can see every answer key', async () => {
    const r = await t.asService('select question_id from public.question_answer_keys');
    assert.ok(r.rows.length >= 3, 'expected answer keys to exist');
  });

  it('each user sees exactly their own quizzes, and they differ', async () => {
    const alice = await t.asUser(USERS.alice, 'select id from public.quizzes');
    const bob = await t.asUser(USERS.bob, 'select id from public.quizzes');

    assert.ok(alice.rows.length > 0, 'Alice must see her own quiz');
    assert.ok(bob.rows.length > 0, 'Bob must see his own quiz');

    const aliceIds = alice.rows.map(r => r.id);
    const bobIds = bob.rows.map(r => r.id);
    assert.ok(
      !aliceIds.some(id => bobIds.includes(id)),
      'the two users must not share any visible quiz'
    );
  });

  it('the owner can read their own quiz and its questions', async () => {
    const q = await t.asUser(USERS.alice, 'select id, title from public.quizzes where id = $1', [
      seed.aliceQuiz,
    ]);
    assert.equal(q.rows.length, 1);
    assert.equal(q.rows[0].title, 'Alice quiz');

    const questions = await t.asUser(
      USERS.alice,
      'select id from public.questions where quiz_id = $1',
      [seed.aliceQuiz]
    );
    assert.equal(questions.rows.length, 2);
  });

  it('profiles were created for both users', async () => {
    for (const id of [USERS.alice, USERS.bob]) {
      const r = await t.asUser(id, 'select id from public.profiles where id = $1', [id]);
      assert.equal(r.rows.length, 1, `profile missing for ${id}`);
    }
  });

  it('RLS is genuinely doing the filtering, not an empty table', async () => {
    const asService = await t.asService('select count(*)::int n from public.quizzes');
    const asAnon = await t.asAnon('select count(*)::int n from public.quizzes');
    assert.ok(asService.rows[0].n > 0, 'service_role must see rows');
    assert.equal(asAnon.rows[0].n, 0, 'anon must see none');
  });
});

// ===========================================================================
// 1. Unauthenticated access to private records is denied
// ===========================================================================
describe('1. unauthenticated (anon) access', () => {
  it('cannot read any quizzes', async () => {
    const r = await t.asAnon('select id from public.quizzes');
    assert.equal(r.rows.length, 0);
  });

  it('cannot read any questions', async () => {
    const r = await t.asAnon('select id from public.questions');
    assert.equal(r.rows.length, 0);
  });

  it('cannot read answer keys', async () => {
    const r = await t.asAnon('select question_id from public.question_answer_keys');
    assert.equal(r.rows.length, 0);
  });

  it('cannot read profiles', async () => {
    const r = await t.asAnon('select id from public.profiles');
    assert.equal(r.rows.length, 0);
  });

  it('cannot read attempts or attempt answers', async () => {
    assert.equal((await t.asAnon('select id from public.quiz_attempts')).rows.length, 0);
    assert.equal((await t.asAnon('select id from public.attempt_answers')).rows.length, 0);
  });

  it('cannot read share links', async () => {
    const r = await t.asAnon('select id from public.share_links');
    assert.equal(r.rows.length, 0);
  });

  it('cannot read usage counters', async () => {
    const r = await t.asAnon('select user_id from public.usage_counters');
    assert.equal(r.rows.length, 0);
  });

  it('cannot read the generation log', async () => {
    const r = await t.asAnon('select id from public.generation_log');
    assert.equal(r.rows.length, 0);
  });

  it('cannot insert a quiz', async () => {
    await expectRlsError(() =>
      t.asAnon(
        `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
         values ($1, 'anon', 'MCQ', 'Easy', 1, 'text')`,
        [USERS.alice]
      )
    );
  });
});

// ===========================================================================
// 2. User A cannot access or modify User B's private data
// ===========================================================================
describe('2. cross-user isolation', () => {
  it("Alice cannot see Bob's quiz", async () => {
    const r = await t.asUser(USERS.alice, 'select id from public.quizzes where id = $1', [
      seed.bobQuiz,
    ]);
    assert.equal(r.rows.length, 0);
  });

  it("Alice cannot see Bob's questions", async () => {
    const r = await t.asUser(USERS.alice, 'select id from public.questions where id = $1', [
      seed.questions.bobQ1,
    ]);
    assert.equal(r.rows.length, 0);
  });

  it("Alice cannot update Bob's quiz", async () => {
    const r = await t.asUser(
      USERS.alice,
      `update public.quizzes set title = 'hijacked' where id = $1 returning id`,
      [seed.bobQuiz]
    );
    assert.equal(r.rows.length, 0);
  });

  it("Alice cannot delete Bob's quiz", async () => {
    const r = await t.asUser(USERS.alice, 'delete from public.quizzes where id = $1 returning id', [
      seed.bobQuiz,
    ]);
    assert.equal(r.rows.length, 0);
  });

  it("Bob's quiz is untouched after Alice's attempts", async () => {
    const r = await t.asRoot('select title from public.quizzes where id = $1', [seed.bobQuiz]);
    assert.equal(r.rows[0].title, 'Bob quiz');
  });

  it("Alice cannot attach a question to Bob's quiz", async () => {
    await expectRlsError(() =>
      t.asUser(
        USERS.alice,
        `insert into public.questions (quiz_id, position, type, prompt)
         values ($1, 99, 'MCQ', 'injected')`,
        [seed.bobQuiz]
      )
    );
  });

  it("Alice cannot read Bob's attempt answers", async () => {
    const attemptId = (
      await t.asRoot(
        `insert into public.quiz_attempts (quiz_id, user_id, status, score, max_score, submitted_at, graded_at)
         values ($1, $2, 'graded', 1, 2, now(), now()) returning id`,
        [seed.bobQuiz, USERS.bob]
      )
    ).rows[0].id;

    await t.asRoot(
      `insert into public.attempt_answers (attempt_id, question_id, response, is_correct, points_awarded, graded_at)
       values ($1, $2, '"b"', true, 1, now())`,
      [attemptId, seed.questions.bobQ1]
    );

    const r = await t.asUser(
      USERS.alice,
      'select id from public.attempt_answers where attempt_id = $1',
      [attemptId]
    );
    assert.equal(r.rows.length, 0);
  });
});

// ===========================================================================
// 3. Users cannot change ownership to bypass authorization
// ===========================================================================
describe('3. ownership cannot be reassigned', () => {
  it('Alice cannot transfer her quiz to Bob', async () => {
    // Rejected by WITH CHECK rather than silently filtered, because the row
    // she is trying to produce would not belong to her.
    await expectDenied(() =>
      t.asUser(USERS.alice, 'update public.quizzes set owner_id = $1 where id = $2 returning id', [
        USERS.bob,
        seed.aliceQuiz,
      ])
    );

    const after = await t.asRoot('select owner_id from public.quizzes where id = $1', [
      seed.aliceQuiz,
    ]);
    assert.equal(after.rows[0].owner_id, USERS.alice);
  });

  it('Alice cannot insert a quiz owned by Bob', async () => {
    await expectRlsError(() =>
      t.asUser(
        USERS.alice,
        `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
         values ($1, 'owned by bob', 'MCQ', 'Easy', 1, 'text')`,
        [USERS.bob]
      )
    );
  });

  it('Alice cannot create a profile row for Bob', async () => {
    await expectRlsError(() =>
      t.asUser(USERS.alice, 'insert into public.profiles (id, theme) values ($1, $2)', [
        USERS.carol,
        'dark',
      ])
    );
  });

  it('Alice cannot move her profile onto another id', async () => {
    await expectDenied(() =>
      t.asUser(USERS.alice, 'update public.profiles set id = $1 where id = $2 returning id', [
        USERS.carol,
        USERS.alice,
      ])
    );
  });

  it('Alice can still read and update her own profile', async () => {
    const r = await t.asUser(
      USERS.alice,
      'update public.profiles set theme = $1 where id = $2 returning theme',
      ['dark', USERS.alice]
    );
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0].theme, 'dark');
  });
});

// ===========================================================================
// 4. Correct answers cannot be read before submission
// ===========================================================================
describe('4. correct-answer protection', () => {
  it("Bob cannot read Alice's answer keys", async () => {
    // Scoped to Alice's quiz: Bob legitimately owns an answer key of his own,
    // so an unscoped count would be 1 and would prove nothing.
    const r = await t.asUser(
      USERS.bob,
      `select k.correct_answer
       from public.question_answer_keys k
       join public.questions q on q.id = k.question_id
       where q.quiz_id = $1`,
      [seed.aliceQuiz]
    );
    assert.equal(r.rows.length, 0);
  });

  it('Bob cannot read a specific answer key by question id', async () => {
    // Deliberately NOT joined to `questions`. A join would also be filtered by
    // the questions policy, so a weakness in the answer-key policy itself
    // would go unnoticed — mutation testing showed exactly that blind spot.
    // This isolates the control under test.
    const r = await t.asUser(
      USERS.bob,
      'select correct_answer from public.question_answer_keys where question_id = $1',
      [seed.questions.aliceQ1]
    );
    assert.equal(r.rows.length, 0);
  });

  it('anon cannot read any answer keys', async () => {
    const r = await t.asAnon('select correct_answer from public.question_answer_keys');
    assert.equal(r.rows.length, 0);
  });

  it('anon cannot read an answer key even knowing the question id', async () => {
    const r = await t.asAnon(
      'select correct_answer from public.question_answer_keys where question_id = $1',
      [seed.questions.aliceQ1]
    );
    assert.equal(r.rows.length, 0);
  });

  it('the answer key lives in a physically separate table from the question', async () => {
    // A shared-quiz query that selects every column of `questions` must still
    // be structurally incapable of returning an answer.
    const columns = (
      await t.asRoot(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = 'questions'`
      )
    ).rows.map(r => r.column_name);

    assert.ok(!columns.includes('correct_answer'), 'questions must not carry correct_answer');
    assert.ok(!columns.includes('explanation'), 'questions must not carry explanation');
  });

  it('the owner can read their own answer keys', async () => {
    const r = await t.asUser(
      USERS.alice,
      `select k.correct_answer
       from public.question_answer_keys k
       join public.questions q on q.id = k.question_id
       where q.quiz_id = $1`,
      [seed.aliceQuiz]
    );
    assert.equal(r.rows.length, 2);
  });

  it('Bob cannot write an answer key onto a question he does not own', async () => {
    await expectRlsError(() =>
      t.asUser(
        USERS.bob,
        `insert into public.question_answer_keys (question_id, correct_answer)
         values ($1, 'hijack')`,
        [seed.questions.aliceQ1]
      )
    );
  });
});

// ===========================================================================
// 5. Authoritative counters cannot be altered by clients
// ===========================================================================
describe('5. usage counters and share-link access counts', () => {
  it('a client cannot read usage counters', async () => {
    await t.asRoot(
      `insert into public.usage_counters (user_id, scope, window_key, generations)
       values ($1, 'day', '2026-10-23', 3)`,
      [USERS.alice]
    );
    const r = await t.asUser(
      USERS.alice,
      'select generations from public.usage_counters where user_id = $1',
      [USERS.alice]
    );
    assert.equal(r.rows.length, 0);
  });

  it('a client cannot insert or reset usage counters', async () => {
    await expectDenied(() =>
      t.asUser(
        USERS.alice,
        `insert into public.usage_counters (user_id, scope, window_key, generations)
         values ($1, 'day', '2026-10-24', 0)`,
        [USERS.alice]
      )
    );

    await expectDenied(() =>
      t.asUser(USERS.alice, `update public.usage_counters set generations = 0 where user_id = $1`, [
        USERS.alice,
      ])
    );

    // And the seeded value is untouched.
    const after = await t.asRoot(
      'select generations from public.usage_counters where user_id = $1',
      [USERS.alice]
    );
    assert.equal(after.rows[0].generations, 3);
  });

  it('a client cannot increment or reset a share-link access count', async () => {
    const linkId = await createShareLink(t, {
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'count-token',
    });

    // Alice created this link, so she can read it — but not modify it.
    const read = await t.asUser(
      USERS.alice,
      'select access_count from public.share_links where id = $1',
      [linkId]
    );
    assert.equal(read.rows.length, 1);

    const updated = await t.asUser(
      USERS.alice,
      'update public.share_links set access_count = 0 where id = $1 returning id',
      [linkId]
    );
    assert.equal(updated.rows.length, 0);

    const after = await t.asRoot('select access_count from public.share_links where id = $1', [
      linkId,
    ]);
    assert.equal(after.rows[0].access_count, 0);
  });

  it('a client cannot extend a share-link expiry or clear revocation', async () => {
    const linkId = await createShareLink(t, {
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'extend-token',
      revoked: true,
    });

    const r = await t.asUser(
      USERS.alice,
      'update public.share_links set revoked_at = null, expires_at = now() + $1::interval where id = $2 returning id',
      ['400 days', linkId]
    );
    assert.equal(r.rows.length, 0);

    const after = await t.asRoot('select revoked_at from public.share_links where id = $1', [
      linkId,
    ]);
    assert.ok(after.rows[0].revoked_at !== null, 'revocation must survive');
  });

  it('only the server path can increment the access count', async () => {
    await createShareLink(t, {
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'server-increment',
    });

    const r = await t.asService('select public.record_share_access($1) as new_count', [
      'server-increment',
    ]);
    assert.equal(r.rows[0].new_count, 1);

    const again = await t.asService('select public.record_share_access($1) as new_count', [
      'server-increment',
    ]);
    assert.equal(again.rows[0].new_count, 2);
  });

  it('anon cannot call the share-access function at all', async () => {
    await expectRlsError(() =>
      t.asAnon('select public.record_share_access($1)', ['server-increment'])
    );
  });
});

// ===========================================================================
// 6. Anonymous access is limited to explicitly permitted operations
// ===========================================================================
describe('6. anonymous access scope', () => {
  it('anon cannot resolve share tokens directly', async () => {
    await expectRlsError(() =>
      t.asAnon('select public.resolve_share_link($1)', ['server-increment'])
    );
  });

  it('anon cannot read quiz content even knowing the quiz id', async () => {
    const r = await t.asAnon('select id, title from public.quizzes where id = $1', [
      seed.aliceQuiz,
    ]);
    assert.equal(r.rows.length, 0);
  });

  it('anon cannot write an attempt', async () => {
    await expectRlsError(() =>
      t.asAnon(
        `insert into public.quiz_attempts (quiz_id, user_id, status)
         values ($1, null, 'submitted')`,
        [seed.aliceQuiz]
      )
    );
  });

  it('anon cannot read the retention view', async () => {
    await expectDenied(() => t.asAnon('select * from public.retention_purge_candidates'));
  });

  it('anon cannot invoke the new-user trigger function', async () => {
    await expectRlsError(() => t.asAnon('select public.handle_new_user()'));
  });
});

// ===========================================================================
// 7. Expired and revoked share links grant no access
// ===========================================================================
describe('7. share-link expiry, revocation and access limits', () => {
  it('a valid link resolves', async () => {
    await createShareLink(t, {
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'valid-token',
    });

    const r = await t.asService('select * from public.resolve_share_link($1)', ['valid-token']);
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0].quiz_id, seed.aliceQuiz);
  });

  it('an unknown token resolves to nothing', async () => {
    const r = await t.asService('select * from public.resolve_share_link($1)', ['no-such-token']);
    assert.equal(r.rows.length, 0);
  });

  it('an expired link does not resolve', async () => {
    await createShareLink(t, {
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'expired-token',
      expiresIn: '5 days',
      createdAgo: '45 days',
    });

    const r = await t.asService('select * from public.resolve_share_link($1)', ['expired-token']);
    assert.equal(r.rows.length, 0);
  });

  it('a revoked link does not resolve', async () => {
    await createShareLink(t, {
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'revoked-token',
      revoked: true,
    });

    const r = await t.asService('select * from public.resolve_share_link($1)', ['revoked-token']);
    assert.equal(r.rows.length, 0);
  });

  it('an exhausted link does not resolve once max_access is reached', async () => {
    await createShareLink(t, {
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'capped-token',
      maxAccess: 1,
    });

    const first = await t.asService('select * from public.resolve_share_link($1)', [
      'capped-token',
    ]);
    assert.equal(first.rows.length, 1);

    await t.asService('select public.record_share_access($1)', ['capped-token']);

    const second = await t.asService('select * from public.resolve_share_link($1)', [
      'capped-token',
    ]);
    assert.equal(second.rows.length, 0);
  });

  it('recording access on an expired link returns null and does not increment', async () => {
    await createShareLink(t, {
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'expired-increment',
      expiresIn: '5 days',
      createdAgo: '45 days',
      accessCount: 0,
    });

    const r = await t.asService('select public.record_share_access($1) as n', [
      'expired-increment',
    ]);
    assert.equal(r.rows[0].n, null);
  });

  it('the database refuses a share link that outlives 30 days', async () => {
    await assert.rejects(
      () =>
        t.asRoot(
          `insert into public.share_links (quiz_id, created_by, token_hash, expires_at)
           values ($1, $2, sha256(convert_to('too-long','UTF8')), now() + interval '31 days')`,
          [seed.aliceQuiz, USERS.alice]
        ),
      error => error.code === '23514',
      'expected the 30-day share-link constraint to reject this row'
    );
  });

  it('share links never expose the raw token', async () => {
    await createShareLink(t, {
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'secret-token-value',
    });

    const r = await t.asRoot('select token_hash from public.share_links where created_by = $1', [
      USERS.alice,
    ]);
    for (const row of r.rows) {
      const hex = Buffer.from(row.token_hash).toString('hex');
      assert.ok(
        !hex.includes(Buffer.from('secret-token-value').toString('hex')),
        'raw token must never be stored'
      );
    }

    // And the stored value is the sha256 of the token.
    const matches = await t.asRoot(
      `select count(*)::int as n from public.share_links
       where token_hash = sha256(convert_to('secret-token-value','UTF8'))`
    );
    assert.equal(matches.rows[0].n, 1);
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/**
 * Share links have no client INSERT policy by design, so tests create them
 * through the root/service path — the same path a future Edge Function uses.
 *
 * `createdAgo` backdates created_at. It is needed for expired links: the
 * share_links_window_check constraint requires expires_at > created_at, so a
 * link cannot be *born* expired. In production links become expired by time
 * passing; here we simulate that by moving the whole row into the past.
 */
async function createShareLink(
  testDb,
  {
    quizId,
    createdBy,
    token,
    expiresIn = '7 days',
    createdAgo = '0 days',
    revoked = false,
    maxAccess = null,
    accessCount = 0,
  }
) {
  const result = await testDb.asRoot(
    `insert into public.share_links
       (quiz_id, created_by, token_hash, created_at, expires_at, revoked_at, max_access, access_count)
     values (
       $1, $2, sha256(convert_to($3, 'UTF8')),
       now() - $4::interval,
       now() - $4::interval + $5::interval,
       case when $6::boolean then now() - $4::interval else null end,
       $7, $8
     )
     returning id`,
    [quizId, createdBy, token, createdAgo, expiresIn, revoked, maxAccess, accessCount]
  );
  return result.rows[0].id;
}
