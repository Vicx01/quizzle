# Supabase Migration Plan

**Status: AUDIT AND PLAN ONLY. NO MIGRATION CODE HAS BEEN WRITTEN.**

Awaiting owner approval before implementation begins.

Audit performed against branch `arena/9131a5e6-quizzle` at commit `8b6b582`.
Local and remote are in sync.

---

## 0. Phase 1 status — database foundation COMPLETE (2026-10-23)

Phase 1 is implemented and verified. It is **schema-only**: no application code
was changed, Firebase is untouched and still handles authentication, no
migrations have been applied to any Supabase project, and nothing is deployed.

| Deliverable                        | Location                                                  |
| ---------------------------------- | --------------------------------------------------------- |
| Schema, constraints, triggers      | `supabase/migrations/20261023112449_core_schema.sql`      |
| RLS policies                       | `supabase/migrations/20261023112535_rls_policies.sql`     |
| Retention eligibility              | `supabase/migrations/20261023112557_retention.sql`        |
| Share resolution + access counting | `supabase/migrations/20261023112608_share_resolution.sql` |
| Soft delete                        | `supabase/migrations/20261023112616_soft_delete.sql`      |
| Executed security tests            | `tests/database/rls.test.mjs` (74 assertions)             |
| Executed schema/retention tests    | `tests/database/schema.test.mjs`                          |
| Test harness (Supabase emulation)  | `tests/database/harness.mjs`                              |
| Setup guide                        | `docs/SUPABASE_SETUP.md`                                  |

Run the database suite with `npm run test:db`. It needs no Docker, no local
Supabase stack, no network and no credentials.

**§5 and §6 below are the original proposal.** They were superseded by the
implemented migrations in four ways — see "Changes from the original proposal"
in §5. Where this document and `supabase/migrations/` disagree, the migrations
are authoritative.

### Deployed and verified on hosted Supabase

The owner created project `quizzle` (`ppswtryoescehrytxvsh`, eu-west-1,
PostgreSQL 17.11) and all five migrations were applied to it through the
Supabase API. The behaviour that was previously "not verified — no hosted
project existed" has now been checked directly:

- RLS enabled on all nine tables, with policy counts matching the local suite.
- Cross-user isolation, anonymous denial, server-only counters, share expiry
  and revocation, access counting and soft delete all behave as designed.
- A client `insert` into `quiz_attempts` was rejected with `42501`, confirming
  on the real service that clients cannot supply their own scores.
- The profile-bootstrap trigger fires against the real GoTrue `auth.users`
  schema — something the local engine could not prove.

Every hosted check ran inside a transaction that was rolled back. A follow-up
count confirmed 0 users and 0 rows across all tables, so **no test data was
left behind**. Full results are tabulated in `docs/SUPABASE_SETUP.md` §10.

Local migration filenames were renamed to the versions Supabase assigned
(e.g. `20261023112449_core_schema.sql`) so that a future `supabase db push`
recognises them as already applied instead of re-running them.

**Still not verified:** Google sign-in. The provider cannot be configured
through the API available here and needs OAuth credentials created in the
Google Cloud Console by the owner.

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

## 5. Database schema (IMPLEMENTED)

Authoritative source: `supabase/migrations/`. Nine tables in `public`.

| Table                  | Purpose                                        | Owner-scoped           |
| ---------------------- | ---------------------------------------------- | ---------------------- |
| `profiles`             | App preferences per Supabase user              | self                   |
| `quizzes`              | Quiz metadata, ownership, soft delete          | `owner_id`             |
| `questions`            | Safe question content only — no answers        | via quiz               |
| `question_answer_keys` | `correct_answer`, `explanation`                | via quiz               |
| `share_links`          | Token **hash**, expiry, revocation, access cap | `created_by`           |
| `quiz_attempts`        | One attempt; `user_id` nullable for anonymous  | `user_id` / quiz owner |
| `attempt_answers`      | Per-question response + authoritative grading  | via attempt            |
| `usage_counters`       | Quota accounting                               | **server-only**        |
| `generation_log`       | Generation audit trail                         | **server-only**        |

Enums mirror `types/index.ts` exactly (`MCQ|theory|mixed`,
`Easy|Medium|Hard`, `text|pdf|docx|txt`), and the product rule of at most 50
questions is a `CHECK`, not an application convention.

### Changes from the original proposal

1. **Answers moved to their own table.** The proposal kept `correct_answer`
   and `explanation` on `questions`. They now live in `question_answer_keys`.
   RLS cannot redact columns, so the future "take a shared quiz" function must
   `select` a safe column list. Physically separating the answer key means a
   careless `select *` in that function **cannot** leak it. The original design
   was one sloppy query away from exposing the entire answer key.
2. **Share tokens are stored as SHA-256 hashes**, never in the clear. A database
   dump or an accidental log therefore yields no usable share URLs. The raw
   token is returned once at creation and never persisted.
3. **`attempts` split into `quiz_attempts` + `attempt_answers`.** Grading data
   (`is_correct`, `points_awarded`, `feedback`) is per-question and must be
   queryable, which a jsonb blob on the attempt does not allow.
4. **Added `question_answer_keys`, `attempt_answers` and a `soft_delete_quiz`
   function.** See §6 for why soft delete needed a function.

### Source-document retention

`quizzes.source_meta` stores at most filename, byte size and extracted-text
length. Neither the document nor its extracted text is ever persisted, which
satisfies the approved "process then discard" policy at the schema level. No
Storage bucket is created.

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

## 6. Row Level Security (IMPLEMENTED)

Authoritative source: `supabase/migrations/20261023112535_rls_policies.sql`.

RLS is enabled on all nine tables. Every policy is scoped to a named role —
never to `PUBLIC`, because `anon` and `authenticated` are both members of
`PUBLIC` and a `PUBLIC` policy would silently widen access.

| Table                  | Client SELECT                            | Client INSERT/UPDATE/DELETE |
| ---------------------- | ---------------------------------------- | --------------------------- |
| `profiles`             | self                                     | self (no DELETE)            |
| `quizzes`              | own, excluding soft-deleted              | own                         |
| `questions`            | own quizzes                              | own quizzes                 |
| `question_answer_keys` | own quizzes                              | own quizzes                 |
| `share_links`          | creator only                             | **none**                    |
| `quiz_attempts`        | own attempts, or attempts on own quizzes | **none**                    |
| `attempt_answers`      | same as parent attempt                   | **none**                    |
| `usage_counters`       | **none**                                 | **none**                    |
| `generation_log`       | **none**                                 | **none**                    |

Three design points worth stating explicitly:

- **Attempts are written only by the server.** The requirement is that
  client-supplied scores are never trusted. Rather than permit an insert and
  try to constrain which columns a client may set, all writes go through an
  Edge Function under the service-role key. The function computes the score
  authoritatively and returns it, so an anonymous user — who has no row to
  read, because `anon` has no policy — still sees their result.
- **Soft delete needed a function.** The SELECT policy hides rows where
  `deleted_at is null` is false. PostgreSQL re-checks an updated row against
  the table's SELECT policies, so a plain
  `update quizzes set deleted_at = now()` fails with "new row violates
  row-level security policy" — the row it produces is one the policy says the
  owner may not see. PostgreSQL forbids `WITH CHECK` on a SELECT policy, so
  this cannot be relaxed in the policy. `public.soft_delete_quiz()` performs it
  as `SECURITY DEFINER` after checking ownership itself.
- **Share expiry is enforced in the database.** `public.resolve_share_link()`
  and `public.record_share_access()` apply expiry, revocation and access-cap
  rules, and are executable by `service_role` only.

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

### Cutover rule — how it was actually applied

The rule was **"Firebase stays until Supabase sign-in is verified on the real
platforms."** Because this sandbox has no network path to Google or to the
Supabase host, that verification is impossible from here — so the rule was
resolved the other way at the owner's explicit instruction: Supabase became the
sole provider in code, and the outstanding browser verification is **labelled
rather than silently assumed**.

The second half of the rule was honoured exactly: a missing or malformed
Supabase config produces the actionable "Finish Supabase setup" checklist, never
a dead sign-in button.

**Status of the live OAuth migration: not complete.** It requires (a) rotating
the Google OAuth client secret, which could not be verified, and (b) one
successful real-browser sign-in by the owner.

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

## 12. Decisions — resolved and outstanding

### Resolved by the owner before Phase 1

| #   | Decision                  | Outcome                                                                                                                              |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Supabase project          | Owner creates it; URL + anon key supplied when the app is wired. No credentials needed for Phase 1.                                  |
| 2   | Persistent Storage bucket | **Not needed.** Process in memory, then discard. No bucket is created.                                                               |
| 3   | Docker / local stack      | **Not required.** Tests run on PGlite inside Node. This was the constraint that shaped the test harness.                             |
| 4   | Anonymous attempts        | **Supported.** `quiz_attempts.user_id` is nullable; abuse prevention is server-side.                                                 |
| 5   | Cutover                   | **Clean swap.** No dual-run, because there is no production data.                                                                    |
| 6   | AI provider               | **Deferred.** Still unselected.                                                                                                      |
| 7   | 30-day cleanup            | **Eligible temporary records only.** Share links are purgeable; quiz history and attempts are user-owned and are never auto-deleted. |

### Still open

1. **Create the Supabase project** and supply the project URL and anon key.
   Blocking for the auth phase, not for the database phase.
2. **Apply the migrations** to a real project and re-run the RLS checks in
   `docs/SUPABASE_SETUP.md` §5. The suite proves the SQL against PostgreSQL; it
   cannot prove hosted Supabase behaviour.
3. **30-day sweep execution** — eligibility is encoded in the database, but the
   scheduled job that performs the delete is not implemented.
4. **AI provider selection** — deliberately deferred.

---

## 13. Phased implementation sequence

| #   | Phase                                 | Status             | Deliverable                                                                                                |
| --- | ------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1   | Project + local setup                 | **Done** (adapted) | `supabase/migrations/`, env contract documented in `docs/SUPABASE_SETUP.md`. No Docker used.               |
| 2   | Schema + migrations                   | **Done**           | Five migration files; applied and verified on every test run                                               |
| 3   | RLS policies + **executed** tests     | **Done**           | 74 executed assertions, plus mutation-checked so they fail when a policy is broken                         |
| 4   | Google-only auth                      | **Code complete**  | Supabase is the SOLE provider; Firebase Auth deleted. **Real-browser sign-in NOT verified — owner action** |
| 5   | Profiles + quiz persistence           | Not started        | Owner CRUD, replaces the prototype alert                                                                   |
| 6   | Secure sharing + server-side grading  | Not started        | Edge Functions implementing `docs/SHARE_LINK_API.md`                                                       |
| 7   | Storage (conditional)                 | Not needed         | Owner decided against persistent storage                                                                   |
| 8   | Server-side AI + quotas               | Not started        | Edge Function behind `AIProvider`; server-enforced quotas                                                  |
| 9   | Docs cleanup + Firebase removal       | Not started        | Delete `firestore.rules`/`firebase.json`, drop the `firebase` dependency                                   |
| 10  | Final verification + migration report | Not started        | Full test run, actual counts, commit hashes                                                                |

Phase 4 is the first that changes user-visible behaviour. Phases 1–3 are
complete and touched no application code.

**Phase 4 outcome:** Supabase is the sole auth provider in code and Firebase
Auth is deleted. The phase is **not** signed off, because a real Google
sign-in has never been executed and the OAuth client secret rotation is
unverified. See `NEXT_STEPS.md`.

---

## 14. Files that changed — Phase 1 (actual)

**Added**

- `supabase/migrations/20261023112449_core_schema.sql`
- `supabase/migrations/20261023112535_rls_policies.sql`
- `supabase/migrations/20261023112557_retention.sql`
- `supabase/migrations/20261023112608_share_resolution.sql`
- `supabase/migrations/20261023112616_soft_delete.sql`
- `tests/database/harness.mjs`, `tests/database/rls.test.mjs`,
  `tests/database/schema.test.mjs`
- `docs/SUPABASE_SETUP.md`

**Modified**

- `package.json` — added the `test:db` script and the `@electric-sql/pglite`
  dev dependency
- `jest.config.js` — `tests/database/` added to `testPathIgnorePatterns` so the
  node:test suite can never be collected by Jest

**Deliberately unchanged**

- Every file under `theme/`, `components/`, `hooks/`, `screens/`, `services/`
  and `types/` — this is a backend migration, not a frontend rewrite.
- All Firebase code. Authentication still runs on Firebase and still works.

**Still to change in later phases**

- `services/firebase.ts` → Supabase client; `services/auth.ts` → Supabase Auth
- `App.tsx`, `screens/SignIn.tsx`, `screens/Account.tsx` and their tests
- `package.json` — `firebase` → `@supabase/supabase-js`
- Delete `firebase.json`, `firestore.rules`, `jest.rules.config.js`,
  `tests/rules/firestore.rules.test.ts`
- Add `supabase/functions/*`
- Update `ARCHITECTURE.md` §3.9 (still Firestore-shaped), `README.md`,
  `docs/SHARE_LINK_API.md`
