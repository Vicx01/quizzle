-- Quizzle — Row Level Security policies.
--
-- Posture: deny by default. RLS is enabled on every table in `public`, and a
-- table with RLS enabled but no matching policy returns zero rows for SELECT
-- and rejects INSERT/UPDATE/DELETE. Several tables below deliberately have NO
-- policies at all — that absence is the control, not an oversight.
--
-- Two roles reach the database from a client:
--   * anon          — no JWT (not signed in)
--   * authenticated — a valid Supabase JWT; auth.uid() returns the user id
--
-- service_role bypasses RLS entirely and is used only by Edge Functions. It
-- is never exposed to the client and must never appear in an EXPO_PUBLIC_*
-- variable.
--
-- Every policy below is scoped `to <role>`. Policies are never granted to
-- PUBLIC, because `anon` and `authenticated` are both members of PUBLIC and a
-- PUBLIC-scoped policy would silently widen access.

alter table public.profiles            enable row level security;
alter table public.quizzes             enable row level security;
alter table public.questions           enable row level security;
alter table public.question_answer_keys enable row level security;
alter table public.share_links         enable row level security;
alter table public.quiz_attempts       enable row level security;
alter table public.attempt_answers     enable row level security;
alter table public.usage_counters      enable row level security;
alter table public.generation_log      enable row level security;

-- ===========================================================================
-- profiles — self only
-- ===========================================================================
-- `with check (auth.uid() = id)` on insert and update is what stops a user
-- from creating or moving a profile onto another user's id.

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No DELETE policy. Profile removal is part of account deletion, which runs
-- server-side (and mostly happens via `on delete cascade` from auth.users).

-- ===========================================================================
-- quizzes — owner only
-- ===========================================================================
-- There is intentionally no shared/public SELECT path. Sharing is resolved
-- server-side; a token in a client's hands grants no direct table access.

-- Excludes soft-deleted rows, so a deleted quiz disappears from the owner's
-- history immediately rather than lingering in the UI.
--
-- NOTE: this policy is also what makes a plain
--     update public.quizzes set deleted_at = now()
-- fail with "new row violates row-level security policy". PostgreSQL re-checks
-- an updated row against the table's SELECT policies, so the row the owner is
-- trying to produce is one this policy says they may not see. PostgreSQL does
-- not permit WITH CHECK on a SELECT policy, so the policy cannot be relaxed
-- for that single operation. Soft deletion is therefore exposed through
-- public.soft_delete_quiz() in 20261023112616_soft_delete.sql.
create policy quizzes_select_own on public.quizzes
  for select to authenticated
  using (auth.uid() = owner_id and deleted_at is null);

-- with check rejects an insert whose owner_id is not the caller, so ownership
-- cannot be claimed at creation time.
create policy quizzes_insert_own on public.quizzes
  for insert to authenticated
  with check (auth.uid() = owner_id);

-- Both USING and WITH CHECK reference owner_id, so an update can neither
-- start from someone else's row nor end up as someone else's row. This is
-- what makes "change owner_id to gain access" fail.
create policy quizzes_update_own on public.quizzes
  for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy quizzes_delete_own on public.quizzes
  for delete to authenticated
  using (auth.uid() = owner_id);

-- ===========================================================================
-- questions — owner of the parent quiz
-- ===========================================================================
-- Ownership is derived through the quiz rather than stored on the question,
-- so there is no denormalised owner column that could drift out of sync with
-- the quiz it belongs to.
--
-- INSERT's WITH CHECK evaluates the NEW row's quiz_id, so a caller cannot
-- attach a question to a quiz they do not own.

create policy questions_select_own on public.questions
  for select to authenticated
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = questions.quiz_id and q.owner_id = auth.uid()
    )
  );

create policy questions_insert_own on public.questions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.quizzes q
      where q.id = questions.quiz_id and q.owner_id = auth.uid()
    )
  );

create policy questions_update_own on public.questions
  for update to authenticated
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = questions.quiz_id and q.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quizzes q
      where q.id = questions.quiz_id and q.owner_id = auth.uid()
    )
  );

create policy questions_delete_own on public.questions
  for delete to authenticated
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = questions.quiz_id and q.owner_id = auth.uid()
    )
  );

-- ===========================================================================
-- question_answer_keys — owner of the parent quiz, and nobody else
-- ===========================================================================
-- This is the core of correct-answer protection.
--
-- No policy grants access to `anon`, and no policy grants access to an
-- authenticated user who is not the quiz owner. Taking a quiz — even a shared
-- one — therefore confers no ability to read the answer key. The only reader
-- is the grading path running under service_role.
--
-- Note the two-hop join: answer key -> question -> quiz -> owner. Even a
-- policy bug on `questions` cannot by itself expose answer keys, because this
-- table has its own independent check.

create policy answer_keys_select_own on public.question_answer_keys
  for select to authenticated
  using (
    exists (
      select 1
      from public.questions q
      join public.quizzes z on z.id = q.quiz_id
      where q.id = question_answer_keys.question_id and z.owner_id = auth.uid()
    )
  );

create policy answer_keys_insert_own on public.question_answer_keys
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.questions q
      join public.quizzes z on z.id = q.quiz_id
      where q.id = question_answer_keys.question_id and z.owner_id = auth.uid()
    )
  );

create policy answer_keys_update_own on public.question_answer_keys
  for update to authenticated
  using (
    exists (
      select 1
      from public.questions q
      join public.quizzes z on z.id = q.quiz_id
      where q.id = question_answer_keys.question_id and z.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.questions q
      join public.quizzes z on z.id = q.quiz_id
      where q.id = question_answer_keys.question_id and z.owner_id = auth.uid()
    )
  );

create policy answer_keys_delete_own on public.question_answer_keys
  for delete to authenticated
  using (
    exists (
      select 1
      from public.questions q
      join public.quizzes z on z.id = q.quiz_id
      where q.id = question_answer_keys.question_id and z.owner_id = auth.uid()
    )
  );

-- ===========================================================================
-- share_links — creator may list; nothing else is client-facing
-- ===========================================================================
-- SELECT only, and only for links the caller created, so the Share screen can
-- list "my links".
--
-- There is deliberately NO insert/update/delete policy. Consequences:
--   * access_count cannot be incremented or reset by a client — it is
--     authoritative and server-managed.
--   * expires_at / revoked_at cannot be extended or cleared by a client —
--     revocation and creation are Edge Function operations.
--
-- The raw token is never stored (only a SHA-256 hash), so this SELECT cannot
-- hand a user a working link they did not already have.

create policy share_links_select_own on public.share_links
  for select to authenticated
  using (auth.uid() = created_by);

-- ===========================================================================
-- quiz_attempts — readable by the author and the quiz owner; writes are
-- server-side only
-- ===========================================================================
-- Why clients cannot INSERT or UPDATE an attempt:
--
--   The requirement is that client-supplied scores are never trusted. RLS
--   cannot express "you may insert this row but only if score IS NULL" as a
--   durable guarantee without also constraining every future server write,
--   and a permissive insert policy is one careless `with check` away from
--   letting a user award themselves any score they like.
--
--   Attempts are therefore created, submitted and graded exclusively by an
--   Edge Function under service_role. That function computes the score
--   authoritatively and returns the result to the caller, so an anonymous
--   user — who has no row to read, because anon has no policy here — still
--   sees their score.
--
--   Signed-in users additionally get SELECT so the History screen can list
--   past attempts without a function call.

create policy attempts_select_own on public.quiz_attempts
  for select to authenticated
  using (auth.uid() = user_id);

-- The quiz owner sees attempts made on their quizzes (including anonymous
-- ones), which is what makes per-quiz results possible.
create policy attempts_select_quiz_owner on public.quiz_attempts
  for select to authenticated
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_attempts.quiz_id and q.owner_id = auth.uid()
    )
  );

-- ===========================================================================
-- attempt_answers — same visibility as the parent attempt; no client writes
-- ===========================================================================
-- Visibility is derived from the attempt, so it stays consistent with the
-- attempt policies above rather than duplicating the ownership logic.
--
-- No INSERT/UPDATE/DELETE policy: is_correct, points_awarded, feedback and
-- graded_at are all server-set. A client that could write these could mark
-- its own answers correct.

create policy attempt_answers_select on public.attempt_answers
  for select to authenticated
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_answers.attempt_id
        and (
          a.user_id = auth.uid()
          or exists (
            select 1 from public.quizzes q
            where q.id = a.quiz_id and q.owner_id = auth.uid()
          )
        )
    )
  );

-- ===========================================================================
-- usage_counters — no client policies (server-only)
-- ===========================================================================
-- No policy is defined on purpose. With RLS enabled this denies every client
-- operation, so a user can neither read their remaining quota nor reset it.
-- All access is via Edge Functions using service_role.

-- ===========================================================================
-- generation_log — no client policies (server-only)
-- ===========================================================================
-- No policy on purpose, as above.
