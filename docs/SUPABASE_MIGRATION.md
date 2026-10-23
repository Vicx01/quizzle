# Supabase Migration Plan

**Status: AUDIT AND PLAN ONLY. NO MIGRATION CODE HAS BEEN WRITTEN.**

Awaiting owner approval before implementation begins.

Audit performed against branch `arena/9131a5e6-quizzle` at commit `8b6b582`.
Local and remote are in sync.

---

## 1. Headline finding — there is almost nothing to migrate

The most important result of the audit: **Firestore is completely unused.**

| Firebase service    | Used by the app?               | Evidence                                                                                                                                                   |
| ------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**  | **YES — and verified working** | Owner completed a live Google sign-in                                                                                                                      |
| **Firestore**       | **NO**                         | No `setDoc`/`addDoc`/`updateDoc`/`deleteDoc` anywhere in app source. `getFirebaseFirestore()` is defined in `services/firebase.ts:54` and **never called** |
| **Storage**         | **NO**                         | No bucket code; the file picker keeps only `{ name, size }` in React state — never the file content                                                        |
| **Cloud Functions** | **NO**                         | No server-side code exists                                                                                                                                 |
| **Deployed rules**  | **NO**                         | `firestore.rules` exists on disk, never deployed, never executed                                                                                           |

Consequences:

- **There is no production data.** Nothing needs migrating, and no cutover
  window or dual-write period is required for data.
- **The migration is essentially an authentication swap plus greenfield backend
  work**, not a data migration.
- Firebase can be removed cleanly once Supabase Auth is verified. There is no
  data-loss risk.

This is worth stating plainly because it changes the risk profile entirely: the
dangerous part of a backend migration (moving data) does not exist here.

---

## 2. What is actually implemented today

Distinguishing implemented from merely documented, as requested.

### Implemented and working

| Feature                              | Location                                     | Status                |
| ------------------------------------ | -------------------------------------------- | --------------------- |
| Google sign-in                       | `services/auth.ts`                           | **Verified by owner** |
| Sign-out                             | `screens/Account.tsx`, `App.tsx`             | Implemented, tested   |
| Account screen (name/email/photo)    | `screens/Account.tsx`                        | Implemented, tested   |
| Auth state transitions               | `App.tsx`                                    | Implemented, tested   |
| Config diagnostics + setup checklist | `services/firebase.ts`, `screens/SignIn.tsx` | Implemented, tested   |
| Design system, light/dark            | `theme/`                                     | Approved              |
| Generate screen UI                   | `screens/Generate.tsx`                       | **UI only**           |

### NOT implemented (prototype, contract, or placeholder)

| Feature                                       | Reality                                                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Quiz generation                               | `screens/Generate.tsx:128` — `handleGenerate` shows an `Alert`: "Backend/AI generation is not implemented in this prototype" |
| Quiz persistence                              | None. No database writes exist                                                                                               |
| History / Share / Account tabs beyond Account | `App.tsx` renders `PlaceholderScreen` ("not implemented yet")                                                                |
| Share links                                   | **Contract only** in `docs/SHARE_LINK_API.md`. No code                                                                       |
| Server-side API                               | Does not exist                                                                                                               |
| AI provider                                   | Not implemented, provider not selected                                                                                       |
| Usage quotas                                  | `App.tsx:177` passes `quota={null}`; the app deliberately renders nothing rather than inventing numbers                      |
| Firestore security rules                      | Written (`firestore.rules` v3), **never executed or deployed**                                                               |

---

## 3. Firebase dependency inventory

### Runtime dependencies

```
firebase                      ^11.0.1    (dependencies)
@firebase/rules-unit-testing  ^5.0.2     (devDependencies)
```

### Source files importing Firebase

| File                                  | Import                                                | Purpose                          |
| ------------------------------------- | ----------------------------------------------------- | -------------------------------- |
| `services/firebase.ts`                | `firebase/app`, `firebase/auth`, `firebase/firestore` | Config, init, diagnostics        |
| `services/auth.ts`                    | `firebase/auth`                                       | Sign-in, sign-out, error mapping |
| `App.tsx`                             | `type { User } from 'firebase/auth'`                  | Auth state                       |
| `screens/Account.tsx`                 | `type { User } from 'firebase/auth'`                  | Display identity                 |
| `screens/__tests__/Account.test.tsx`  | `type { User }`                                       | Test typing                      |
| `tests/rules/firestore.rules.test.ts` | `firebase/firestore`, `@firebase/rules-unit-testing`  | 45 unexecuted rules tests        |

### Config and rules files

| File                   | Disposition                                           |
| ---------------------- | ----------------------------------------------------- |
| `firebase.json`        | Emulator config — delete                              |
| `firestore.rules`      | 45 tested rules, never run — delete after replacement |
| `jest.rules.config.js` | Rules test runner — delete after replacement          |

### Environment variables

`EXPO_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID`,
`_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_MEASUREMENT_ID`.

Referenced in `services/firebase.ts` (config + placeholder detection) and in
`services/__tests__/firebase.test.ts`, `screens/__tests__/SignIn.test.tsx`.

The owner manages `.env` manually; **no `.env.example` will be created**.

### Documentation mentioning Firebase

`docs/FIREBASE_SETUP.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `NEXT_STEPS.md`,
`PROJECT_CONTEXT.md`, `README.md`.

---

## 4. Proposed Supabase architecture

```
┌─────────────────────────────────────────────────┐
│  Existing Expo app (unchanged UI/design system)  │
│  screens/ · components/ · theme/ · hooks/        │
└──────────────────┬──────────────────────────────┘
                   │  @supabase/supabase-js (anon key)
                   │  EXPO_PUBLIC_SUPABASE_URL
                   │  EXPO_PUBLIC_SUPABASE_ANON_KEY
┌──────────────────▼──────────────────────────────┐
│              Supabase Platform                   │
│                                                  │
│  Auth (Google only)  ──► auth.users (managed)    │
│  Postgres + RLS      ──► public.* tables         │
│  Edge Functions      ──► service-role, AI keys   │
│  Storage             ──► ephemeral only (TBD)    │
└──────────────────────────────────────────────────┘
```

**Key principle:** the client talks to Supabase with the **anon key** and can
only do what RLS permits. Everything privileged — grading, access-count
increments, quota accounting, AI calls — runs in **Edge Functions** using the
**service-role key**, which never leaves the server.

### Mapping Firebase concepts to Supabase

| Firebase                 | Supabase                         |
| ------------------------ | -------------------------------- |
| Firebase Auth            | Supabase Auth (`auth.users`)     |
| Firestore security rules | PostgreSQL Row Level Security    |
| Cloud Functions          | Edge Functions (Deno/TypeScript) |
| Firestore collections    | Postgres tables                  |
| Firestore Storage        | Supabase Storage                 |
| Admin SDK bypass         | service-role key (server only)   |

---

## 5. Database schema (proposed)

Normalised, replacing the denormalised Firestore model. UUID primary keys,
`timestamptz` throughout, foreign keys with `ON DELETE CASCADE`.

```sql
-- Profiles: keyed by Supabase auth user id. Never duplicate email/name
-- that already lives in auth.users beyond what the UI needs.
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text,
  theme       text not null default 'system' check (theme in ('light','dark','system')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.quizzes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  format        text not null check (format in ('MCQ','theory','mixed')),
  difficulty    text not null check (difficulty in ('Easy','Medium','Hard')),
  question_count int not null check (question_count between 1 and 50),
  timer_seconds int check (timer_seconds is null or timer_seconds > 0),
  source_type   text not null check (source_type in ('text','pdf','docx','txt')),
  source_meta   jsonb,          -- filename/size only. NOT extracted text (see §7)
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index quizzes_owner_created_idx on public.quizzes (owner_id, created_at desc);

-- Questions split out. This is what makes hidden answers enforceable:
-- correct_answer lives in its own table with no anon/client SELECT policy.
create table public.questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes on delete cascade,
  position      int  not null,
  type          text not null check (type in ('MCQ','theory')),
  prompt        text not null,
  options       jsonb,            -- MCQ only
  latex_blocks  jsonb,
  correct_answer text,            -- NEVER exposed pre-submission
  explanation   text,             -- NEVER exposed pre-submission
  unique (quiz_id, position)
);
create index questions_quiz_idx on public.questions (quiz_id, position);

create table public.attempts (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes on delete cascade,
  user_id        uuid references auth.users on delete cascade, -- null = anonymous share attempt
  share_link_id  uuid references public.share_links on delete set null,
  answers        jsonb not null,
  score          int,
  max_score      int,
  time_spent_seconds int,
  completed_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index attempts_quiz_idx  on public.attempts (quiz_id, created_at desc);
create index attempts_user_idx  on public.attempts (user_id, created_at desc);

create table public.share_links (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes on delete cascade,
  token        text not null unique,      -- high-entropy, server-generated
  created_by   uuid not null references auth.users on delete cascade,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  access_count int not null default 0,
  max_access   int,
  created_at   timestamptz not null default now()
);
create index share_links_token_idx on public.share_links (token);
create index share_links_quiz_idx  on public.share_links (quiz_id);

-- Usage accounting. Clients have NO write access; only Edge Functions
-- increment these, so a user cannot reset their own quota.
create table public.usage_counters (
  user_id    uuid not null references auth.users on delete cascade,
  window_key text not null,     -- e.g. '2026-10-23' or '2026-10'
  scope      text not null,     -- 'day' | 'month'
  generations int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, scope, window_key)
);

create table public.generation_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  quiz_id     uuid references public.quizzes on delete set null,
  provider    text,             -- which AI provider served it
  status      text not null,    -- 'succeeded' | 'failed'
  error_code  text,
  created_at  timestamptz not null default now()
);
```

### Data classification

| Table                                   | Classification                                         |
| --------------------------------------- | ------------------------------------------------------ |
| `profiles`                              | Private — owner only                                   |
| `quizzes`                               | Private — owner only                                   |
| `questions.prompt/options/latex_blocks` | Shareable via allowlist                                |
| `questions.correct_answer/explanation`  | **Secret until submitted** — no client-readable policy |
| `attempts`                              | Private — author, plus quiz owner (aggregate)          |
| `share_links`                           | Server-only for writes; token is the bearer credential |
| `usage_counters`                        | **Server-only** — no client read or write              |
| `generation_log`                        | Server-only                                            |

---

## 6. Row Level Security

RLS enabled on **every** table in `public`. Default posture: deny.

```sql
alter table public.profiles        enable row level security;
alter table public.quizzes         enable row level security;
alter table public.questions       enable row level security;
alter table public.attempts        enable row level security;
alter table public.share_links     enable row level security;
alter table public.usage_counters  enable row level security;
alter table public.generation_log  enable row level security;

-- Profiles: self only.
create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Quizzes: owner only. No public/shared SELECT path exists.
create policy quizzes_owner on public.quizzes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Questions: visible only to the quiz owner.
-- There is deliberately NO anon/shared policy. Answers are served by an
-- Edge Function, never read directly by a client.
create policy questions_owner on public.questions
  for all using (
    exists (select 1 from public.quizzes q
            where q.id = questions.quiz_id and q.owner_id = auth.uid())
  );

-- Attempts: the author, or the quiz owner.
create policy attempts_read on public.attempts
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.quizzes q
               where q.id = attempts.quiz_id and q.owner_id = auth.uid())
  );
create policy attempts_insert on public.attempts
  for insert with check (auth.uid() = user_id);

-- Share links: nobody reads or writes these from the client.
-- (No policy at all = denied. An explicit policy is omitted by design.)

-- Usage counters and generation log: no client policies. Server-only.
```

### Invariants this enforces

- A client-supplied `owner_id` / `user_id` cannot override identity —
  `with check (auth.uid() = owner_id)` rejects mismatched rows.
- `usage_counters` has **no client policy**, so a user cannot read or reset
  their own quota.
- `questions.correct_answer` has **no anon policy**, so it cannot leak through
  a share link. This is a structural guarantee, not a filter applied in code —
  a stronger position than Firestore offered, where rules could not redact
  fields.
- Share resolution, grading and access-count increments run in Edge Functions
  with the service-role key, so they bypass RLS deliberately and only there.

---

## 7. Uploaded documents — do we need Storage at all?

**The approved retention policy already answers this:**

> Uploaded source material: temporary processing; discard after generation by
> default.
> (PROJECT_CONTEXT.md §7)

And the current app retains nothing — `screens/Generate.tsx:118` stores only
`{ name, size }`, never the file content.

**Recommendation: do not create a persistent Storage bucket in phase 1.**

- Upload → extract text → generate → discard, all within one Edge Function
  request.
- Only `source_meta` (filename, size, extracted length) is persisted on the
  quiz row.
- This matches the approved policy, avoids a retention/cleanup burden, and
  removes an entire class of cross-user file-access risk.

A private bucket is only needed if the owner later decides to retain originals.
If so: private bucket, server-side validation of size and content type,
user-scoped path prefix (`{user_id}/{uuid}`), signed URLs with short expiry, no
public bucket, and a defined deletion job. **This needs an explicit owner
decision — see §12.**

---

## 8. Server-side AI integration and quotas

The AI provider is **not selected** and implementation is explicitly deferred.
The design must keep it replaceable.

```
Client ──► Edge Function `generate-quiz` ──► AIProvider interface ──► provider
              │
              ├─ verify JWT (auth.uid())
              ├─ validate input (count ≤ 50, format, difficulty, size caps)
              ├─ check + increment usage_counters (atomic RPC)
              ├─ extract text from source
              ├─ call provider (key from Edge Function secrets)
              └─ persist quiz + questions, return quiz id
```

- Provider credentials live only in **Edge Function secrets**. Never in
  `EXPO_PUBLIC_*`, never in a table readable by clients.
- The `AIProvider` interface (PROJECT_CONTEXT.md §4) is preserved, so the
  provider can be swapped without a frontend change.
- Quotas enforced **server-side** in `usage_counters` via an atomic Postgres
  function — not client counters, not UI restrictions.
- Order of evaluation stays: GroqCloud → NVIDIA NIM → Mistral, all pending
  live verification. **No paid usage without explicit owner approval.**

---

## 9. Authentication migration

### What changes

| Concern          | Firebase                         | Supabase                                  |
| ---------------- | -------------------------------- | ----------------------------------------- |
| Client           | `firebase/app` + `firebase/auth` | `@supabase/supabase-js`                   |
| Provider         | `GoogleAuthProvider` + popup     | `signInWithOAuth({ provider: 'google' })` |
| Session          | `onAuthStateChanged`             | `onAuthStateChange`                       |
| Ownership key    | Firebase UID                     | Supabase `auth.users.id` (UUID)           |
| Desktop/web flow | Popup + redirect                 | OAuth redirect + PKCE                     |
| Native           | Not built                        | Expo AuthSession / WebBrowser             |

### Required dashboard configuration

**Google Cloud Console** — a **new** OAuth client is required. The existing
Firebase-managed client cannot simply be reused:

1. Create an OAuth 2.0 Client ID (type: Web application).
2. Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Authorised JavaScript origins: each app origin.
4. Configure the consent screen (app name, support email, developer contact) —
   this already caused one 403 during the Firebase work and must be right.
5. Add mobile redirect URIs later if native platforms are targeted.

**Supabase dashboard:**

1. Authentication → Providers → **Google → Enabled**, paste client ID/secret.
2. Authentication → URL Configuration → **Site URL** and **Redirect URLs** for:
   - local dev (`http://localhost:8081` or whichever port Expo chooses)
   - preview host (`https://8080-<sandbox>.e2b.app`)
   - production
3. Note that the preview sandbox ID **changes between sessions**, so the
   preview redirect URL must be updated, or wildcarded carefully.

### Behaviour to preserve

Loading state, error mapping (unauthorised origin, popup blocked, cancellation),
session restoration across reload, sign-out returning to the sign-in screen with
protected screens unreachable, and the existing diagnostics that print the
current origin (which solved the earlier no-address-bar problem).

### Cutover rule

**Firebase stays until Supabase sign-in is verified on the real platforms.** The
config-check mechanism should be extended so a missing Supabase config produces
the same actionable setup state rather than a dead button.

---

## 10. Testing strategy and acceptance criteria

| Layer                | Approach                                                                                                                                                                                                          | Current status                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| App unit tests       | Jest + RNTL                                                                                                                                                                                                       | **149 passing / 14 suites** today; must stay green |
| Auth tests           | Mock Supabase client; assert transitions                                                                                                                                                                          | To write                                           |
| Migration checks     | `supabase db reset` applies all migrations cleanly                                                                                                                                                                | To write                                           |
| **RLS policy tests** | Local Supabase (CLI) + `postgres` test role, or a dedicated test project. Assert **allowed and denied** for: unauthenticated, cross-user, revoked link, expired link, premature answer retrieval, quota tampering | To write                                           |
| Share/grading tests  | Edge Function tests against local stack                                                                                                                                                                           | To write                                           |
| Type/lint/format     | `tsc`, `eslint`, `prettier`                                                                                                                                                                                       | Green today                                        |
| Web build            | `expo export --platform web`                                                                                                                                                                                      | To run                                             |

**Critical prerequisite for RLS testing:** the Supabase CLI local stack runs on
**Docker**. If Docker is unavailable on the Windows dev machine, RLS tests must
run against a hosted **test project** instead — never against production.

**Honesty rule, carried forward:** tests that are written but not executed will
be reported as such. The existing 45 Firestore rules tests are the cautionary
example — written, never run, and never counted as passing.

---

## 11. Risks and rollback

| Risk                                              | Severity | Mitigation                                                                       |
| ------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| Docker unavailable → RLS tests cannot run locally | High     | Fall back to a hosted test project; do not test against production               |
| Preview sandbox ID changes break OAuth redirect   | High     | Documented; re-add redirect URL per session or use a stable host                 |
| Google OAuth client misconfigured → 403 again     | High     | Reuse the Firebase 403 troubleshooting section; consent screen first             |
| Service-role key leaked into `EXPO_PUBLIC_*`      | Critical | Never; enforced by review and by the fact that no `EXPO_PUBLIC_` var may hold it |
| Two auth providers briefly active                 | Medium   | Acceptable during migration only; remove Firebase before production              |
| AI provider unselected / unverified               | Medium   | Keep behind interface; do not implement yet                                      |
| Anonymous share attempts (`user_id` null)         | Medium   | Needs an owner decision (see §12)                                                |
| 30-day retention needs a cleanup job              | Low      | Scheduled Edge Function; not in phase 1                                          |

**Rollback:** because there is no data, rollback is trivial — revert the commit
and restore `.env` values. `git revert` on a phase commit returns the app to
the working Firebase state. There is no database to unwind.

---

## 12. Decisions required before implementation

1. **Supabase project** — who creates it, and can you provide the project URL
   and anon key? (I will not create accounts or provision infrastructure.)
2. **Storage — is it needed at all?** My recommendation is **no persistent
   bucket**, based on the approved "discard after generation" policy. Please
   confirm, or state that originals must be retained.
3. **Docker on your Windows machine?** Determines whether RLS tests run locally
   or against a hosted test project.
4. **Anonymous share attempts** — should someone taking a shared quiz without
   signing in have their attempt recorded with `user_id = null`? Affects the
   attempts RLS policy.
5. **Cutover style** — clean swap (recommended, since there is no data) or a
   deliberate dual-run period anyway?
6. **AI provider** — remains unselected. Confirm this stays deferred until
   phase 8.
7. **30-day retention enforcement** — approve a scheduled cleanup function, or
   defer?

---

## 13. Phased implementation sequence

Each phase ends with a coherent commit, updated docs, and reported test results.

| #   | Phase                                 | Deliverable                                                                                                |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Project + local setup                 | `supabase/` config, CLI working, migrations dir, env var contract documented                               |
| 2   | Schema + migrations                   | SQL above, applied cleanly via `supabase db reset`                                                         |
| 3   | RLS policies + **executed** tests     | Policies plus tests that actually run against local/test Postgres                                          |
| 4   | Google-only auth                      | Supabase Auth wired; Firebase kept until verified; sign-in/out tested on web                               |
| 5   | Profiles + quiz persistence           | Owner CRUD, replaces the prototype alert                                                                   |
| 6   | Secure sharing + server-side grading  | Edge Functions implementing `docs/SHARE_LINK_API.md`, answers hidden until submit                          |
| 7   | Storage (conditional)                 | Only if decision 2 says retain originals                                                                   |
| 8   | Server-side AI + quotas               | Edge Function behind `AIProvider`; server-enforced quotas                                                  |
| 9   | Docs cleanup + Firebase removal       | Replace `docs/FIREBASE_SETUP.md`, delete `firestore.rules`/`firebase.json`, drop the `firebase` dependency |
| 10  | Final verification + migration report | Full test run, actual pass/fail counts, commit hashes                                                      |

Phases 1–3 are safe to do without touching the running app. Phase 4 is the
first that changes user-visible behaviour.

---

## 14. Files that would change

**Rewritten**

- `services/firebase.ts` → replaced by a Supabase client + config diagnostics
- `services/auth.ts` → Supabase Auth (Google only)
- `App.tsx` — auth wiring, `User` type
- `screens/SignIn.tsx` — config checks, no Firebase references
- `screens/Account.tsx` — Supabase user shape
- `screens/__tests__/Account.test.tsx`, `screens/__tests__/SignIn.test.tsx`
- `services/__tests__/auth.test.ts`, `services/__tests__/firebase.test.ts`
- `tests/App.test.tsx`
- `package.json` — `firebase` → `@supabase/supabase-js`

**Deleted**

- `firebase.json`, `firestore.rules`, `jest.rules.config.js`
- `tests/rules/firestore.rules.test.ts` (the 45 unexecuted Firestore tests —
  their _intent_ is carried into the RLS test suite, which must actually run)

**Added**

- `supabase/migrations/*.sql`, `supabase/config.toml`
- `supabase/functions/*` (sharing, grading, generation)
- RLS test suite
- `docs/SUPABASE_SETUP.md` (replaces `docs/FIREBASE_SETUP.md`)

**Updated**

- `ARCHITECTURE.md` (§3.9 data model is Firestore-shaped throughout)
- `PROJECT_CONTEXT.md`, `NEXT_STEPS.md`, `CHANGELOG.md`, `README.md`
- `docs/SHARE_LINK_API.md` (retarget from generic API to Edge Functions)

**Unchanged**

- All of `theme/`, `components/`, `hooks/` — the approved design system is
  untouched, per the "not a frontend rewrite" constraint.
