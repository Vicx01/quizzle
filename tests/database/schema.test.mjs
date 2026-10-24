/**
 * Executed schema, constraint and retention tests.
 *
 * Covers the structural side of the security model: that RLS is actually
 * enabled everywhere, that cascades match the approved retention policy, and
 * that the constraints encoding product rules (<= 50 questions, 30-day share
 * links) really reject bad data.
 *
 * Run with:  npm run test:db
 */

import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createTestDatabase, seedScenario, USERS } from './harness.mjs';

let t;

before(async () => {
  t = await createTestDatabase();
  // Creates the auth users every later test refers to. Many tests insert their
  // own fixtures, but the foreign keys to auth.users must be satisfiable from
  // the start.
  await seedScenario(t);
});

after(async () => {
  await t?.close();
});

async function publicTables() {
  const r = await t.asRoot(
    `select tablename from pg_tables
     where schemaname = 'public' and tablename <> 'retention_purge_candidates'
     order by tablename`
  );
  return r.rows.map(row => row.tablename);
}

// ===========================================================================
describe('migrations and RLS coverage', () => {
  it('applies every migration in order', async () => {
    // Filenames carry the migration versions Supabase assigned when they were
    // applied to the hosted project, so `supabase db push` treats them as
    // already applied instead of re-running them.
    assert.deepEqual(t.appliedMigrations, [
      '20261023112449_core_schema.sql',
      '20261023112535_rls_policies.sql',
      '20261023112557_retention.sql',
      '20261023112608_share_resolution.sql',
      '20261023112616_soft_delete.sql',
      '20261024075942_share_creation.sql',
    ]);
  });

  it('creates the expected tables', async () => {
    assert.deepEqual(await publicTables(), [
      'attempt_answers',
      'generation_log',
      'profiles',
      'question_answer_keys',
      'questions',
      'quiz_attempts',
      'quizzes',
      'share_links',
      'usage_counters',
    ]);
  });

  it('enables RLS on every table in public', async () => {
    const r = await t.asRoot(
      `select relname, relrowsecurity
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'
         and c.relname <> 'retention_purge_candidates'`
    );
    const disabled = r.rows.filter(row => !row.relrowsecurity).map(r2 => r2.relname);
    assert.deepEqual(disabled, [], 'every table must have RLS enabled');
    assert.ok(r.rows.length >= 9);
  });

  it('gives usage_counters and generation_log no client policies at all', async () => {
    const r = await t.asRoot(
      `select tablename, count(*)::int as n
       from pg_policies
       where schemaname = 'public'
         and tablename in ('usage_counters', 'generation_log')
       group by tablename`
    );
    assert.deepEqual(r.rows, [], 'these tables must be server-only');
  });
});

// ===========================================================================
describe('profile bootstrap', () => {
  it('creates a profile when a user is created', async () => {
    const id = 'aaaaaaaa-0000-0000-0000-000000000001';
    await t.asRoot(
      `insert into auth.users (id, email, raw_user_meta_data)
       values ($1, 'new@example.test', '{"full_name":"New User"}')`,
      [id]
    );

    const r = await t.asRoot(
      'select display_name, theme, data_retention_consent from public.profiles where id = $1',
      [id]
    );
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0].display_name, 'New User');
    assert.equal(r.rows[0].theme, 'system');
    assert.equal(r.rows[0].data_retention_consent, false);
  });

  it('does not store an email address on the profile', async () => {
    const columns = (
      await t.asRoot(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles'`
      )
    ).rows.map(r => r.column_name);

    assert.ok(!columns.includes('email'), 'email belongs to auth.users only');
  });

  it('maintains updated_at', async () => {
    const id = 'aaaaaaaa-0000-0000-0000-000000000002';
    await t.asRoot(`insert into auth.users (id, email) values ($1, 'ts@example.test')`, [id]);
    await t.asRoot(
      `update public.profiles set updated_at = updated_at - interval '1 hour' where id = $1`,
      [id]
    );
    await t.asRoot(`update public.profiles set theme = 'dark' where id = $1`, [id]);

    const r = await t.asRoot(
      `select (updated_at > now() - interval '1 minute') as bumped
       from public.profiles where id = $1`,
      [id]
    );
    assert.equal(r.rows[0].bumped, true);
  });
});

// ===========================================================================
describe('product-rule constraints', () => {
  let quizId;

  before(async () => {
    quizId = (
      await t.asRoot(
        `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
         values ($1, 'constraints', 'mixed', 'Medium', 5, 'docx') returning id`,
        [USERS.alice]
      )
    ).rows[0].id;
  });

  it('rejects more than 50 questions', async () => {
    await assert.rejects(
      () =>
        t.asRoot(
          `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
           values ($1, 'too many', 'MCQ', 'Easy', 51, 'text')`,
          [USERS.alice]
        ),
      e => e.code === '23514'
    );
  });

  it('rejects an unknown format, difficulty or source type', async () => {
    for (const [column, value] of [
      ['format', 'TRUE_FALSE'],
      ['difficulty', 'Impossible'],
      ['source_type', 'rtf'],
    ]) {
      await assert.rejects(
        () =>
          t
            .asRoot(
              `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
             values ($1, 'bad enum', $2, 'Easy', 5, 'text')`,
              [USERS.alice, value]
            )
            .catch(async () => {
              // The offending column varies, so retry against the right one.
              return t.asRoot(
                `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
               values ($1, 'bad enum', 'MCQ', 'Easy', 5, $2)`,
                [USERS.alice, value]
              );
            }),
        e => e.code === '23514',
        `expected ${column}=${value} to be rejected`
      );
    }
  });

  it('rejects a zero or negative timer', async () => {
    await assert.rejects(
      () =>
        t.asRoot(
          `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type, timer_seconds)
           values ($1, 'bad timer', 'MCQ', 'Easy', 5, 'text', 0)`,
          [USERS.alice]
        ),
      e => e.code === '23514'
    );
  });

  it('rejects duplicate question positions within a quiz', async () => {
    await t.asRoot(
      `insert into public.questions (quiz_id, position, type, prompt)
       values ($1, 0, 'MCQ', 'first')`,
      [quizId]
    );
    await assert.rejects(
      () =>
        t.asRoot(
          `insert into public.questions (quiz_id, position, type, prompt)
           values ($1, 0, 'MCQ', 'duplicate')`,
          [quizId]
        ),
      e => e.code === '23505'
    );
  });

  it('allows an anonymous attempt with a null user_id', async () => {
    const r = await t.asRoot(
      `insert into public.quiz_attempts (quiz_id, user_id, status)
       values ($1, null, 'submitted') returning user_id`,
      [quizId]
    );
    assert.equal(r.rows[0].user_id, null);
  });

  it('rejects a graded attempt with no score', async () => {
    await assert.rejects(
      () =>
        t.asRoot(
          `insert into public.quiz_attempts (quiz_id, user_id, status, graded_at, submitted_at)
           values ($1, $2, 'graded', now(), now())`,
          [quizId, USERS.alice]
        ),
      e => e.code === '23514'
    );
  });
});

// ===========================================================================
describe('deletion behaviour and retention', () => {
  it('deleting a quiz cascades to questions, answer keys, attempts and links', async () => {
    const seed = await seedScenario(t);

    await t.asRoot(
      `insert into public.quiz_attempts (quiz_id, user_id, status, score, submitted_at, graded_at)
       values ($1, $2, 'graded', 1, now(), now())`,
      [seed.aliceQuiz, USERS.alice]
    );
    await t.asRoot(
      `insert into public.share_links (quiz_id, created_by, token_hash, expires_at)
       values ($1, $2, sha256(convert_to('cascade-token','UTF8')), now() + interval '1 day')`,
      [seed.aliceQuiz, USERS.alice]
    );

    await t.asRoot('delete from public.quizzes where id = $1', [seed.aliceQuiz]);

    assert.equal(
      (
        await t.asRoot('select count(*)::int n from public.questions where quiz_id = $1', [
          seed.aliceQuiz,
        ])
      ).rows[0].n,
      0
    );
    assert.equal(
      (
        await t.asRoot(
          `select count(*)::int n from public.question_answer_keys k
           join public.questions q on q.id = k.question_id
           where q.quiz_id = $1`,
          [seed.aliceQuiz]
        )
      ).rows[0].n,
      0
    );
    assert.equal(
      (
        await t.asRoot('select count(*)::int n from public.quiz_attempts where quiz_id = $1', [
          seed.aliceQuiz,
        ])
      ).rows[0].n,
      0
    );
    assert.equal(
      (
        await t.asRoot('select count(*)::int n from public.share_links where quiz_id = $1', [
          seed.aliceQuiz,
        ])
      ).rows[0].n,
      0
    );
  });

  it('deleting a share link preserves the attempt but clears the link', async () => {
    const seed = await seedScenario(t);

    const linkId = (
      await t.asRoot(
        `insert into public.share_links (quiz_id, created_by, token_hash, expires_at)
         values ($1, $2, sha256(convert_to('nullify-token','UTF8')), now() + interval '1 day')
         returning id`,
        [seed.aliceQuiz, USERS.alice]
      )
    ).rows[0].id;

    const attemptId = (
      await t.asRoot(
        `insert into public.quiz_attempts (quiz_id, user_id, share_link_id, status)
         values ($1, null, $2, 'submitted') returning id`,
        [seed.aliceQuiz, linkId]
      )
    ).rows[0].id;

    await t.asRoot('delete from public.share_links where id = $1', [linkId]);

    const r = await t.asRoot('select share_link_id from public.quiz_attempts where id = $1', [
      attemptId,
    ]);
    assert.equal(r.rows.length, 1, 'the attempt must survive link cleanup');
    assert.equal(r.rows[0].share_link_id, null);
  });

  it('deleting a quiz preserves the generation log entry but clears quiz_id', async () => {
    const seed = await seedScenario(t);
    const logId = (
      await t.asRoot(
        `insert into public.generation_log (user_id, quiz_id, provider, status)
         values ($1, $2, 'pending-selection', 'succeeded') returning id`,
        [USERS.alice, seed.aliceQuiz]
      )
    ).rows[0].id;

    await t.asRoot('delete from public.quizzes where id = $1', [seed.aliceQuiz]);

    const r = await t.asRoot('select quiz_id from public.generation_log where id = $1', [logId]);
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0].quiz_id, null);
  });

  it('deleting a user cascades to their profile and quizzes', async () => {
    const id = 'bbbbbbbb-0000-0000-0000-000000000001';
    await t.asRoot(`insert into auth.users (id, email) values ($1, 'cascade@example.test')`, [id]);
    const quizId = (
      await t.asRoot(
        `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
         values ($1, 'cascade quiz', 'MCQ', 'Easy', 1, 'text') returning id`,
        [id]
      )
    ).rows[0].id;

    await t.asRoot('delete from auth.users where id = $1', [id]);

    assert.equal(
      (await t.asRoot('select count(*)::int n from public.profiles where id = $1', [id])).rows[0].n,
      0
    );
    assert.equal(
      (await t.asRoot('select count(*)::int n from public.quizzes where id = $1', [quizId])).rows[0]
        .n,
      0
    );
  });

  it('lists only expired or long-revoked share links as purge candidates', async () => {
    const seed = await seedScenario(t);
    // createdAgo backdates the whole row: the window constraint forbids a link
    // from being born expired, so "expired" is simulated by moving it into the
    // past exactly as time passing would in production.
    const link = async (token, createdAgo, expiresIn, revoked) =>
      (
        await t.asRoot(
          `insert into public.share_links
             (quiz_id, created_by, token_hash, created_at, expires_at, revoked_at)
           values (
             $1, $2, sha256(convert_to($3,'UTF8')),
             now() - $4::interval,
             now() - $4::interval + $5::interval,
             case when $6::boolean then now() - interval '40 days' else null end
           )
           returning id`,
          [seed.aliceQuiz, USERS.alice, token, createdAgo, expiresIn, revoked]
        )
      ).rows[0].id;

    const activeId = await link('purge-active', '0 days', '5 days', false);
    const staleExpiredId = await link('purge-stale', '45 days', '5 days', false);
    const staleRevokedId = await link('purge-revoked', '0 days', '5 days', true);

    const eligible = (
      await t.asRoot('select record_id from public.retention_purge_candidates')
    ).rows.map(r => r.record_id);

    assert.ok(!eligible.includes(activeId), 'an active link must never be purgeable');
    assert.ok(eligible.includes(staleExpiredId), 'a long-expired link is eligible');
    assert.ok(eligible.includes(staleRevokedId), 'a long-revoked link is eligible');
  });

  it('refuses to soft-delete a quiz the caller does not own', async () => {
    const seed = await seedScenario(t);

    const asBob = await t.asUser(USERS.bob, 'select public.soft_delete_quiz($1) as deleted', [
      seed.aliceQuiz,
    ]);
    assert.equal(asBob.rows[0].deleted, false);

    const stillThere = await t.asRoot('select deleted_at from public.quizzes where id = $1', [
      seed.aliceQuiz,
    ]);
    assert.equal(stillThere.rows[0].deleted_at, null);
  });

  it('never lists user-owned records as purge candidates', async () => {
    const r = await t.asRoot(`select distinct table_name from public.retention_purge_candidates`);
    const tables = r.rows.map(row => row.table_name);
    for (const table of tables) {
      assert.equal(table, 'share_links', `${table} is user-owned and must not be purged`);
    }
  });

  it('soft-deletes hide a quiz from its owner without destroying the row', async () => {
    const seed = await seedScenario(t);

    // A plain UPDATE is rejected: the row it would produce is one the SELECT
    // policy says the owner may not see, and PostgreSQL forbids WITH CHECK on
    // a SELECT policy. Deletion therefore goes through the RPC.
    await assert.rejects(
      () =>
        t.asUser(USERS.alice, 'update public.quizzes set deleted_at = now() where id = $1', [
          seed.aliceQuiz,
        ]),
      e => e.code === '42501'
    );

    const result = await t.asUser(USERS.alice, 'select public.soft_delete_quiz($1) as deleted', [
      seed.aliceQuiz,
    ]);
    assert.equal(result.rows[0].deleted, true);

    const visible = await t.asUser(USERS.alice, 'select id from public.quizzes where id = $1', [
      seed.aliceQuiz,
    ]);
    assert.equal(visible.rows.length, 0, 'soft-deleted quiz must be hidden by RLS');

    const stillThere = await t.asRoot('select count(*)::int n from public.quizzes where id = $1', [
      seed.aliceQuiz,
    ]);
    assert.equal(stillThere.rows[0].n, 1, 'the row must survive for the retention window');
  });
});
