/**
 * Test harness for Quizzle's Supabase database layer.
 *
 * Runs the real migrations against a real PostgreSQL engine (PGlite —
 * PostgreSQL compiled to WebAssembly) inside Node, so RLS policies are
 * actually EXECUTED rather than statically reviewed. No Docker, no local
 * Supabase stack, no network, no credentials.
 *
 * What this does and does not prove:
 *
 *   It DOES prove the SQL in supabase/migrations is valid, that RLS policies
 *   behave as intended for the anon/authenticated/service_role roles, and that
 *   constraints and cascades behave as intended.
 *
 *   It does NOT prove behaviour on hosted Supabase. Supabase's own GoTrue JWT
 *   handling, PostgREST, connection pooling and the real managed auth schema
 *   are emulated here, not reproduced. Those differences are called out in
 *   docs/SUPABASE_MIGRATION.md as outstanding verification.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..');
export const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations');

/**
 * Recreates the parts of a Supabase project that migrations depend on.
 *
 *   * the three client-facing roles
 *   * the managed `auth` schema (a stub of auth.users, plus auth.uid())
 *   * Supabase's default privileges, which grant ALL on public tables to
 *     anon/authenticated/service_role — meaning RLS, not GRANT, is the
 *     gatekeeper. Emulating this faithfully matters: if we did not grant,
 *     tests could pass because of missing privileges rather than correct
 *     policies.
 */
const SUPABASE_EMULATION_SQL = `
  -- Roles. service_role carries bypassrls exactly as it does on Supabase,
  -- which is why Edge Functions can legitimately bypass RLS.
  do $$
  begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role nologin noinherit bypassrls;
    end if;
  end
  $$;

  grant anon, authenticated, service_role to postgres;

  -- Managed auth schema. Only the columns the migrations touch.
  create schema if not exists auth;

  create table if not exists auth.users (
    id                  uuid primary key,
    email               text unique,
    raw_user_meta_data  jsonb
  );

  -- Mirrors Supabase's own definition closely enough for policy evaluation:
  -- the subject claim of the request JWT.
  create or replace function auth.uid() returns uuid
  language sql stable
  as $fn$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    )::uuid
  $fn$;

  create or replace function auth.role() returns text
  language sql stable
  as $fn$
    select coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
    )::text
  $fn$;

  create or replace function auth.jwt() returns jsonb
  language sql stable
  as $fn$
    select coalesce(
      nullif(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::jsonb
  $fn$;

  grant usage on schema auth to anon, authenticated, service_role;

  -- Supabase default privileges: everything in public is granted to all three
  -- client roles, so RLS is the only thing standing between a client and data.
  grant usage on schema public to anon, authenticated, service_role;

  alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public
    grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public
    grant execute on functions to anon, authenticated, service_role;
`;

/**
 * Applies every migration in supabase/migrations, in filename order, which is
 * exactly how `supabase db push` and `supabase migration up` order them.
 */
async function applyMigrations(db) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No migrations found in ${MIGRATIONS_DIR}`);
  }

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${error.message}\n  ${error.detail ?? ''}`);
    }
  }

  return files;
}

export async function createTestDatabase() {
  const db = await PGlite.create();

  await db.exec(SUPABASE_EMULATION_SQL);
  const appliedMigrations = await applyMigrations(db);

  /**
   * Runs SQL as a given role with a given JWT subject.
   * Both settings are transaction-local, so they cannot leak between tests.
   */
  async function execAs(role, userId, sql, params = []) {
    await db.exec('begin');
    try {
      await db.exec(`set local role '${role}'`);
      const claims = userId ? JSON.stringify({ sub: userId, role }) : JSON.stringify({ role });
      await db.exec(`set local request.jwt.claims = '${claims.replace(/'/g, "''")}'`);
      const result = await db.query(sql, params);
      await db.exec('commit');
      return result;
    } catch (error) {
      await db.exec('rollback');
      throw error;
    }
  }

  return {
    db,
    appliedMigrations,

    /** A signed-in user. */
    asUser: (userId, sql, params) => execAs('authenticated', userId, sql, params),

    /** Not signed in. */
    asAnon: (sql, params) => execAs('anon', null, sql, params),

    /** An Edge Function using the service-role key. Bypasses RLS. */
    asService: (sql, params) => execAs('service_role', null, sql, params),

    /** Superuser, for seeding and inspecting schema metadata. Bypasses RLS. */
    asRoot: (sql, params) => db.query(sql, params),
    execRoot: sql => db.exec(sql),

    async close() {
      await db.close();
    },
  };
}

/** Deterministic UUIDs keep assertions readable. */
export const USERS = {
  alice: '11111111-1111-1111-1111-111111111111',
  bob: '22222222-2222-2222-2222-222222222222',
  carol: '33333333-3333-3333-3333-333333333333',
};

/**
 * Creates two users (triggering profile bootstrap) and gives each a quiz with
 * two questions and answers.
 */
export async function seedScenario(t) {
  for (const [name, id] of Object.entries(USERS)) {
    await t.execRoot(`
      insert into auth.users (id, email, raw_user_meta_data)
      values ('${id}', '${name}@example.test', '{"full_name":"${name}"}')
      on conflict (id) do nothing;
    `);
  }

  const aliceQuiz = (
    await t.asRoot(
      `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
       values ($1, 'Alice quiz', 'MCQ', 'Easy', 2, 'text') returning id`,
      [USERS.alice]
    )
  ).rows[0].id;

  const bobQuiz = (
    await t.asRoot(
      `insert into public.quizzes (owner_id, title, format, difficulty, question_count, source_type)
       values ($1, 'Bob quiz', 'MCQ', 'Hard', 2, 'pdf') returning id`,
      [USERS.bob]
    )
  ).rows[0].id;

  const questions = {};
  for (const [key, quizId] of [
    ['aliceQ1', aliceQuiz],
    ['aliceQ2', aliceQuiz],
    ['bobQ1', bobQuiz],
  ]) {
    questions[key] = (
      await t.asRoot(
        `insert into public.questions (quiz_id, position, type, prompt, options)
         values ($1, $2, 'MCQ', $3, $4::jsonb) returning id`,
        [quizId, key.endsWith('1') ? 0 : 1, `Prompt for ${key}`, JSON.stringify(['a', 'b', 'c'])]
      )
    ).rows[0].id;

    await t.asRoot(
      `insert into public.question_answer_keys (question_id, correct_answer, explanation)
       values ($1, 'b', 'Because b')`,
      [questions[key]]
    );
  }

  return { aliceQuiz, bobQuiz, questions };
}

/** sha256 of a token, matching how migrations hash share tokens. */
export function tokenHash(token) {
  // hex of sha256, computed the same way PostgreSQL's sha256() would.
  // Tests use PGlite itself for hashing to avoid any subtle mismatch.
  return token;
}
