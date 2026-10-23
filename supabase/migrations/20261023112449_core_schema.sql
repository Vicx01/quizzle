-- Quizzle — core PostgreSQL schema (Supabase).
-- Phase 1: database foundation.
--
-- Design notes are deliberately verbose: this file is the contract that later
-- phases (generation, sharing, grading) build against, and several choices
-- here exist purely to make a future insecure query impossible rather than
-- merely discouraged.
--
-- Conventions:
--   * UUID primary keys (gen_random_uuid() is built in from PostgreSQL 13).
--   * All timestamps are timestamptz and default to now().
--   * No SERIAL/IDENTITY: this schema is created once and must be portable.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- One row per authenticated user, keyed by auth.users.id. Deliberately does
-- NOT copy email or avatar_url: those live in auth.users and duplicating them
-- creates a second source of truth that can drift and must be cleaned up.
-- Only user-editable, app-specific preferences belong here.

create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text check (display_name is null or char_length(display_name) between 1 and 80),
  theme                   text not null default 'system' check (theme in ('light', 'dark', 'system')),
  -- Records that the user was told how temporary document processing works
  -- (PROJECT_CONTEXT.md §7). Defaults to false so consent is explicit.
  data_retention_consent  boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- quizzes
-- ---------------------------------------------------------------------------
-- Quiz metadata and ownership. Questions live in their own table; answers live
-- in another table beyond that. The split is the security mechanism, not an
-- aesthetic choice (see question_answer_keys below).

create table public.quizzes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 200),

  -- Mirrors types/index.ts QuizFormat / Difficulty / SourceType.
  format          text not null check (format in ('MCQ', 'theory', 'mixed')),
  difficulty      text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  question_count  integer not null check (question_count between 1 and 50),

  -- Null means "no timer". Upper bound stops a nonsense 10-year timer.
  timer_seconds   integer check (
                    timer_seconds is null
                    or (timer_seconds > 0 and timer_seconds <= 86400)
                  ),

  source_type     text not null check (source_type in ('text', 'pdf', 'docx', 'txt')),

  -- Filename, byte size and extracted-text length ONLY. The uploaded document
  -- and the extracted text are never persisted here (PROJECT_CONTEXT.md §7).
  source_meta     jsonb not null default '{}'::jsonb,

  -- Soft delete. The row survives so a deleted quiz can be purged on the
  -- documented 30-day schedule rather than vanishing instantly and silently.
  deleted_at      timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- History screen reads "my quizzes, newest first".
create index quizzes_owner_created_idx
  on public.quizzes (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
-- Safe-to-share question content only. There is intentionally no
-- correct_answer column on this table.

create table public.questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes (id) on delete cascade,
  position      integer not null check (position >= 0),
  type          text not null check (type in ('MCQ', 'theory')),
  prompt        text not null check (char_length(prompt) between 1 and 4000),
  -- MCQ options as a JSON array of strings; null for theory questions.
  options       jsonb check (options is null or jsonb_typeof(options) = 'array'),
  latex_blocks  jsonb check (latex_blocks is null or jsonb_typeof(latex_blocks) = 'array'),
  created_at    timestamptz not null default now(),

  unique (quiz_id, position)
);

create index questions_quiz_position_idx
  on public.questions (quiz_id, position);

-- ---------------------------------------------------------------------------
-- question_answer_keys
-- ---------------------------------------------------------------------------
-- The answer key, held in a separate table from the question text.
--
-- Why a separate table rather than nullable columns on questions?
--
-- RLS is row-level; it cannot redact individual columns. The future
-- "take a shared quiz" Edge Function must therefore return questions WITHOUT
-- answers, which means it has to be careful about which columns it selects.
-- If answers lived on `questions`, a single careless `select *` in that
-- function would leak the entire answer key to anyone holding a share link.
--
-- Physically separating them means the shared-quiz query *cannot* touch the
-- answers even if it selects every column. The leak becomes impossible rather
-- than merely unlikely. Only the grading path, which runs server-side with the
-- service-role key, ever reads this table.
--
-- Permission to take a quiz therefore never confers permission to read the
-- answer key, because there is no policy that grants non-owners access to this
-- table at all.

create table public.question_answer_keys (
  question_id     uuid primary key references public.questions (id) on delete cascade,
  correct_answer  text not null check (char_length(correct_answer) between 1 and 4000),
  -- Nullable: explanations are optional at generation time.
  explanation     text check (char_length(explanation) <= 8000),
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- share_links
-- ---------------------------------------------------------------------------
-- Server-mediated sharing. There is deliberately no `is_public` flag and no
-- client-readable policy that turns a token into quiz access: resolving a
-- token is a server-side operation (see the share_resolution migration).

create table public.share_links (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes (id) on delete cascade,

  -- SHA-256 of the raw token, never the token itself. A database dump or an
  -- accidental log therefore yields no usable share URLs. sha256() is built in
  -- from PostgreSQL 11, so no extension is required.
  token_hash    bytea not null unique,

  -- Last 4 characters, so the Share screen can distinguish "the link I made
  -- yesterday" without being able to reconstruct the link.
  token_hint    text check (token_hint is null or char_length(token_hint) <= 8),

  created_by    uuid not null references auth.users (id) on delete cascade,

  expires_at    timestamptz not null,
  revoked_at    timestamptz,

  -- access_count is authoritative and server-managed. It is never
  -- client-writable; see the RLS migration.
  access_count  integer not null default 0 check (access_count >= 0),
  max_access    integer check (max_access is null or max_access > 0),

  created_at    timestamptz not null default now(),

  -- Encodes the approved retention rule in the database itself: share links
  -- are temporary by construction and can never outlive 30 days.
  constraint share_links_window_check check (
    expires_at > created_at
    and expires_at <= created_at + interval '30 days'
  )
);

create index share_links_quiz_idx on public.share_links (quiz_id);

-- Supports the retention sweep (see the retention migration).
create index share_links_expires_idx on public.share_links (expires_at);
create index share_links_revoked_idx on public.share_links (revoked_at)
  where revoked_at is not null;

-- ---------------------------------------------------------------------------
-- quiz_attempts
-- ---------------------------------------------------------------------------
-- One row per attempt at a quiz. Writes are server-side only: see the RLS
-- migration for why clients get SELECT but no INSERT/UPDATE/DELETE.

create table public.quiz_attempts (
  id                  uuid primary key default gen_random_uuid(),
  quiz_id             uuid not null references public.quizzes (id) on delete cascade,

  -- Null means the attempt was made anonymously through a share link.
  -- Nullable by design (approved decision: support user_id = null).
  user_id             uuid references auth.users (id) on delete cascade,

  -- Which share link authorised this attempt, if any. Retained on attempt
  -- deletion (set null) so audit history survives link cleanup.
  share_link_id       uuid references public.share_links (id) on delete set null,

  status              text not null default 'submitted'
                        check (status in ('in_progress', 'submitted', 'graded')),

  -- Authoritative, server-computed. Null until graded; stays null for theory
  -- questions awaiting marking. A client never supplies these values.
  score               integer check (score is null or score >= 0),
  max_score           integer check (max_score is null or max_score >= 0),
  time_spent_seconds  integer check (
                        time_spent_seconds is null or time_spent_seconds >= 0
                      ),

  started_at          timestamptz not null default now(),
  submitted_at        timestamptz,
  graded_at           timestamptz,
  created_at          timestamptz not null default now(),

  -- A graded attempt must actually have been submitted and scored.
  constraint quiz_attempts_graded_check check (
    status <> 'graded'
    or (submitted_at is not null and graded_at is not null and score is not null)
  )
);

create index quiz_attempts_user_idx
  on public.quiz_attempts (user_id, created_at desc);
create index quiz_attempts_quiz_idx
  on public.quiz_attempts (quiz_id, created_at desc);
create index quiz_attempts_link_idx
  on public.quiz_attempts (share_link_id)
  where share_link_id is not null;

-- ---------------------------------------------------------------------------
-- attempt_answers
-- ---------------------------------------------------------------------------
-- Per-question responses. A separate table (rather than a jsonb blob on the
-- attempt) so that grading results are queryable, indexable, and individually
-- constrained.

create table public.attempt_answers (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id     uuid not null references public.questions (id) on delete cascade,

  -- What the user submitted. Free-form; shape depends on question type.
  response        jsonb,

  -- Authoritative grading outcome. All four columns below are server-set:
  -- clients have no policy that permits writing them.
  is_correct      boolean,
  points_awarded  numeric(6, 2) check (points_awarded is null or points_awarded >= 0),
  feedback        text check (feedback is null or char_length(feedback) <= 8000),
  graded_at       timestamptz,

  created_at      timestamptz not null default now(),

  unique (attempt_id, question_id)
);

create index attempt_answers_attempt_idx
  on public.attempt_answers (attempt_id);

-- ---------------------------------------------------------------------------
-- usage_counters
-- ---------------------------------------------------------------------------
-- Quota accounting. Clients have no policy on this table at all
-- (neither read nor write), so a user cannot inspect or reset their own
-- quota. Only Edge Functions, using the service-role key, touch it.

create table public.usage_counters (
  user_id      uuid not null references auth.users (id) on delete cascade,
  scope        text not null check (scope in ('day', 'month')),
  window_key   text not null,  -- '2026-10-23' for day, '2026-10' for month
  generations  integer not null default 0 check (generations >= 0),
  updated_at   timestamptz not null default now(),

  primary key (user_id, scope, window_key)
);

create index usage_counters_window_idx
  on public.usage_counters (scope, window_key);

-- ---------------------------------------------------------------------------
-- generation_log
-- ---------------------------------------------------------------------------
-- Append-only record of generation requests, used for abuse detection and
-- debugging failed generations. quiz_id is retained after quiz deletion
-- (set null) so the log stays a faithful audit trail.

create table public.generation_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  quiz_id     uuid references public.quizzes (id) on delete set null,
  provider    text,  -- which AI provider served the request
  status      text not null check (status in ('succeeded', 'failed')),
  error_code  text,
  created_at  timestamptz not null default now()
);

create index generation_log_user_idx
  on public.generation_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger quizzes_set_updated_at
  before update on public.quizzes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile bootstrap
-- ---------------------------------------------------------------------------
-- Creates a profile row when Supabase Auth inserts a user, so the app can
-- treat "profile exists" as an invariant.
--
-- SECURITY DEFINER is required: at signup there is no JWT and no
-- authenticated role, so the insert would otherwise be rejected by RLS.
-- search_path is pinned so the function cannot be hijacked by an object
-- earlier in a caller's search_path.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, data_retention_consent)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    ),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger functions are executable by PUBLIC by default and Supabase's default
-- privileges grant EXECUTE to anon/authenticated. Neither should ever be able
-- to invoke this; it is called only by the trigger.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
