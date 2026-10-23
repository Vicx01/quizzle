/**
 * Executed tests for the share-link primitives the share endpoints depend on.
 *
 * The two Edge Functions delegate every accept/reject decision to
 * `public.resolve_share_link()` and `public.record_share_access()`. If either
 * were callable by a client, the whole point of server-mediated sharing would
 * collapse: a signed-in user could probe tokens directly instead of going
 * through the allowlisted response.
 *
 * The existing rls.test.mjs proves ANON cannot call them. This file closes the
 * more important gap: an AUTHENTICATED user cannot either.
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
 * Inserts a share link. Mirrors the helper in rls.test.mjs; duplicated rather
 * than shared so this file cannot break that suite.
 */
async function createShareLink({
  quizId,
  createdBy,
  token,
  expiresIn = '7 days',
  createdAgo = '0 days',
  revoked = false,
  maxAccess = null,
  accessCount = 0,
}) {
  const result = await t.asRoot(
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

describe('share primitives — who may call them', () => {
  it('resolves a valid token under service_role', async () => {
    await createShareLink({ quizId: seed.aliceQuiz, createdBy: USERS.alice, token: 'share-ok' });

    const r = await t.asService('select * from public.resolve_share_link($1)', ['share-ok']);
    assert.equal(r.rows.length, 1);
    assert.equal(r.rows[0].quiz_id, seed.aliceQuiz);
    assert.ok(r.rows[0].share_link_id, 'expected a share_link_id');
  });

  it('refuses resolve_share_link to a signed-in user', async () => {
    // This is the gap the Edge Functions close: without it, any authenticated
    // caller could enumerate tokens and learn which quizzes exist.
    await assert.rejects(
      () => t.asUser(USERS.alice, 'select public.resolve_share_link($1)', ['share-ok']),
      error => error.code === '42501',
      'authenticated must not be able to resolve tokens'
    );
  });

  it('refuses resolve_share_link to an anonymous caller', async () => {
    await assert.rejects(
      () => t.asAnon('select public.resolve_share_link($1)', ['share-ok']),
      error => error.code === '42501'
    );
  });

  it('refuses record_share_access to a signed-in user', async () => {
    await assert.rejects(
      () => t.asUser(USERS.alice, 'select public.record_share_access($1)', ['share-ok']),
      error => error.code === '42501'
    );
  });

  it('refuses record_share_access to an anonymous caller', async () => {
    await assert.rejects(
      () => t.asAnon('select public.record_share_access($1)', ['share-ok']),
      error => error.code === '42501'
    );
  });
});

describe('share tokens are never stored in the clear', () => {
  it('stores only a SHA-256 digest', async () => {
    const token = 'plain-token-value';
    await createShareLink({ quizId: seed.aliceQuiz, createdBy: USERS.alice, token });

    const rows = await t.asRoot(
      'select token_hash from public.share_links where token_hash = sha256(convert_to($1, $2))',
      [token, 'UTF8']
    );
    assert.equal(rows.rows.length, 1);

    // The stored bytes are a 32-byte digest, not the token.
    const stored = rows.rows[0].token_hash;
    const asText = Buffer.from(stored).toString('utf8');
    assert.ok(!asText.includes(token), 'raw token must never be recoverable from the column');
  });
});

describe('the resolve → record cycle the endpoints use', () => {
  it('increments the access count once per recorded use', async () => {
    await createShareLink({ quizId: seed.aliceQuiz, createdBy: USERS.alice, token: 'cycle-1' });

    const first = await t.asService('select public.record_share_access($1) as n', ['cycle-1']);
    const second = await t.asService('select public.record_share_access($1) as n', ['cycle-1']);

    assert.equal(first.rows[0].n, 1);
    assert.equal(second.rows[0].n, 2);
  });

  it('stops resolving once max_access is reached', async () => {
    await createShareLink({
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'capped',
      maxAccess: 2,
    });

    // Two permitted uses.
    assert.equal(
      (await t.asService('select public.record_share_access($1) as n', ['capped'])).rows[0].n,
      1
    );
    assert.equal(
      (await t.asService('select public.record_share_access($1) as n', ['capped'])).rows[0].n,
      2
    );

    // A third is refused: resolve returns nothing and record returns null, so
    // the endpoint can answer with one generic 404.
    const resolved = await t.asService('select * from public.resolve_share_link($1)', ['capped']);
    assert.equal(resolved.rows.length, 0);

    const recorded = await t.asService('select public.record_share_access($1) as n', ['capped']);
    assert.equal(recorded.rows[0].n, null);
  });

  it('treats an expired link as unusable', async () => {
    await createShareLink({
      quizId: seed.aliceQuiz,
      createdBy: USERS.alice,
      token: 'gone-off',
      expiresIn: '2 days',
      createdAgo: '5 days',
    });

    const resolved = await t.asService('select * from public.resolve_share_link($1)', ['gone-off']);
    assert.equal(resolved.rows.length, 0);
  });

  it('caps a link at 30 days, enforced by the database', async () => {
    // The 30-day retention rule is a CHECK constraint, not a convention.
    await assert.rejects(() =>
      createShareLink({
        quizId: seed.aliceQuiz,
        createdBy: USERS.alice,
        token: 'too-long',
        expiresIn: '60 days',
      })
    );
  });
});
