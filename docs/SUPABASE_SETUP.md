# Quizzle — Supabase Setup Guide

How to create and configure the Supabase project that the migrations in
`supabase/migrations/` are written against.

**Status of this document:** written during Phase 1 (database foundation).
The steps below have **not** been performed — no Supabase project has been
created yet, and no credentials exist in this repository. Everything in
`supabase/migrations/` is verified against a local PostgreSQL engine instead
(see "How the migrations are verified" below).

---

## 0. The project exists — current state (2026-10-23)

The project has been created and the database foundation is **live on it**.

| Item               | Value                                      |
| ------------------ | ------------------------------------------ |
| Project name       | `quizzle`                                  |
| Project ref        | `ppswtryoescehrytxvsh`                     |
| Region             | `eu-west-1`                                |
| Project URL        | `https://ppswtryoescehrytxvsh.supabase.co` |
| PostgreSQL         | 17.11                                      |
| Status             | `ACTIVE_HEALTHY` (all services)            |
| Migrations applied | 5 of 5                                     |
| Rows of app data   | 0 — verified empty after testing           |

### What has been done through the Supabase API

- All five migrations applied and recorded in migration history.
- RLS verified on all nine tables with the expected policy counts.
- Live RLS behaviour tested on the hosted database (see §10).
- Auth URL configuration set, and email/phone sign-in disabled so Google is
  the only remaining provider.

### Google OAuth — ENABLED (verified via API)

`external_google_enabled: true`, with the Google client ID and secret set and
the nonce check left **on** (the more secure setting). Google sign-in is
configured; what remains is wiring the app to use it.

### What still needs you

**Add the credentials to your local `.env`** (see §3) and set
`EXPO_PUBLIC_AUTH_PROVIDER=supabase` when you want to try Supabase sign-in.
Until then the app keeps using Firebase.

The dashboard steps are kept below for reference and for any future project.

1. **Google Cloud Console** → APIs & Services → Credentials →
   Create credentials → OAuth client ID → **Web application**.
2. Configure the **OAuth consent screen** (a mis-set consent screen caused a
   403 during the original Firebase setup — it is not optional).
3. Copy the **Client ID** and **Client Secret**.
4. **Supabase Dashboard** → Authentication → Providers → **Google** → enable,
   paste both values, and copy the callback URL it shows you:
   `https://ppswtryoescehrytxvsh.supabase.co/auth/v1/callback`
5. Add that callback URL to the Google client's **Authorised redirect URIs**.

Until this is done, **no Supabase sign-in provider works at all** — email and
phone were deliberately disabled to enforce Google-only. The app is unaffected
because it still signs in through Firebase.

---

## 1. What you (the owner) must do vs. what is already done

| Step                                       | Who     | Status                |
| ------------------------------------------ | ------- | --------------------- |
| Write the database schema and RLS policies | Agent   | **Done**              |
| Write and run database/security tests      | Agent   | **Done** (74 passing) |
| Create the Supabase project                | Owner   | **Done**              |
| Apply migrations to a project              | Agent   | **Done**              |
| Configure auth URLs, disable email/phone   | Agent   | **Done**              |
| Configure Google OAuth                     | **You** | **Blocks next phase** |
| Wire the app to Supabase                   | Agent   | Next phase            |

Nothing in this phase requires credentials, and nothing has been deployed.

---

## 2. Create the project

1. Sign in at <https://supabase.com/dashboard>.
2. **New project** → choose an organisation, a name, and a region close to your
   users.
3. **Generate a strong database password and store it in a password manager.**
   It cannot be retrieved later except by resetting it, and it is never needed
   by the app — only by direct SQL/CLI access.
4. Wait for the project to finish provisioning (a couple of minutes).

Recommended: create **two** projects now rather than one —
`quizzle-dev` and `quizzle-prod`. See §6.

---

## 3. Credentials and where each one may be used

Supabase exposes three values that matter here. Only two ever belong in the
app, and only one of those is safe to ship to a browser.

| Value                      | Safe in the Expo client? | Notes                                             |
| -------------------------- | ------------------------ | ------------------------------------------------- |
| **Project URL**            | Yes                      | e.g. `https://<project-ref>.supabase.co`          |
| **anon / publishable key** | Yes                      | Designed to be public. RLS is what protects data. |
| **service_role key**       | **NO — never**           | Bypasses RLS entirely. Server-side only.          |
| Database password          | **NO**                   | Direct database access; never used by the app.    |

### Rules that must not be broken

- **Never** put the service-role key or the database password in a variable
  beginning with `EXPO_PUBLIC_`. Expo inlines every `EXPO_PUBLIC_*` value into
  the client bundle, where anyone can read it.
- The service-role key belongs only in Supabase Edge Function secrets
  (and in server-side tooling), never in the repository.
- Edge Functions read secrets from the Supabase-managed environment, not from
  the repo. Do not commit them.

### Variables the app will eventually need

You manage `.env` yourself; this project does not ship a `.env.example`. When
the auth phase begins, the app will read variables along these lines:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>

# Which backend serves sign-in. Omit it (or set `firebase`) to keep the
# current, verified Firebase login. Set to `supabase` to use Supabase.
EXPO_PUBLIC_AUTH_PROVIDER=supabase
```

**`EXPO_PUBLIC_AUTH_PROVIDER` is the migration switch.** Firebase stays the
default so the app never loses a working login while Supabase is being proven.
Only the exact value `supabase` selects Supabase — a typo falls back to
Firebase rather than half-enabling a backend with no credentials.

The exact names will be confirmed when `services/supabase.ts` is written.
Supabase Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` automatically — you do not
set those.

---

## 4. Applying migrations

Migrations live in `supabase/migrations/` and are plain PostgreSQL, applied in
filename order:

```
20261023112449_core_schema.sql
20261023112535_rls_policies.sql
20261023112557_retention.sql
20261023112608_share_resolution.sql
20261023112616_soft_delete.sql
```

Postgres (not Supabase) tracks which migrations have already run, in the table
`supabase_migrations.schema_migrations`.

### Option A — SQL Editor (no installation required)

1. Dashboard → **SQL Editor** → **New query**.
2. Paste the contents of `20261023112449_core_schema.sql`, run it.
3. Repeat for each file **in order**.

This is the quickest path and is perfectly fine for a first project.

### Option B — Supabase CLI (version controlled, repeatable)

```powershell
# One-time
npx supabase login
npx supabase link --project-ref <project-ref>

# Apply any migrations not yet present on the linked project
npx supabase db push
```

`supabase db push` compares local files against `schema_migrations` and applies
only what is missing.

> **Note:** `supabase db push` does **not** require Docker. Only
> `supabase start` (a full local stack) does, and this project deliberately
> does not depend on it.

---

## 5. Verify RLS after applying

Run this in the SQL Editor — every row must show `rls_enabled = true`:

```sql
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;
```

And confirm no table was left exposed:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Expected result: `usage_counters` and `generation_log` have **no** policies
(server-only by design), and `share_links` has exactly one (`SELECT` for the
creator). Everything else has owner-scoped policies.

You can also use **Dashboard → Authentication → Policies** for a visual check,
or **Database → Tables** where each table shows an "RLS enabled" badge.

---

## 6. Separating development, test and production

Use at least two projects. Supabase's free tier allows two active projects.

| Project        | Purpose                             | Rules                          |
| -------------- | ----------------------------------- | ------------------------------ |
| `quizzle-dev`  | Day-to-day development, experiments | Throwaway data. Safe to reset. |
| `quizzle-prod` | Real users                          | Never experiment here.         |

Rules to keep the boundaries honest:

- **Never** point a development build at the production project.
- **Never** run experimental or destructive SQL against production.
- Keep a distinct Google OAuth client per environment (see §7).
- Apply migrations to `dev` first, confirm, then to `prod`.

The sandbox preview host used during development
(`https://8080-<sandbox-id>.e2b.app`) **changes between sessions**, so it
cannot be permanently allow-listed. Each new session needs its host added to
the redirect allow-list, or OAuth will reject the sign-in.

---

## 7. Google OAuth (required, but for the NEXT phase)

This is documented now so it does not become a surprise later. **Do not
complete it in Phase 1** — Firebase authentication stays in place until the
Supabase replacement is working and verified.

1. **Google Cloud Console** → APIs & Services → **Credentials** →
   **Create credentials → OAuth client ID**.
   - A **Web application** client is required for Supabase.
   - The Firebase-managed client cannot simply be reused: Firebase and
     Supabase use different redirect URIs and it is cleaner to keep them
     separate so Firebase can be removed later without breaking Supabase.
2. Configure the **OAuth consent screen**. Skipping this was the cause of a
   `403` during the original Firebase setup — it is not optional.
3. Copy the **Client ID** and **Client Secret**.
4. **Supabase Dashboard** → Authentication → **Providers** → **Google**:
   - Enable it.
   - Paste the Client ID and Client Secret.
   - Copy the Supabase **Callback URL** shown on that page.
5. Back in **Google Cloud Console**, add that callback URL to the client's
   **Authorised redirect URIs**. It looks like:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
6. **Supabase Dashboard** → Authentication → **URL Configuration**:
   - **Site URL**: your app's canonical URL.
   - **Redirect URLs**: add every host that will run the app —
     `http://localhost:8081` (Expo web), `http://localhost:19006`, your
     production host, and the current sandbox preview host.

---

## 8. How the migrations are verified without a project

The migrations are executed against **PGlite** — real PostgreSQL compiled to
WebAssembly — inside Node. No Docker, no local stack, no network, no
credentials.

```
npm run test:db
```

This applies all five migration files in order and then attempts the
operations a client would attempt, as the `anon`, `authenticated` and
`service_role` roles. It emulates Supabase's JWT claims (`auth.uid()`) and its
default privileges, which grant `ALL` on public tables to all three client
roles — so RLS, not GRANT, is what stands between a client and the data,
exactly as on Supabase.

**What this does not prove:** behaviour on hosted Supabase. GoTrue's real JWT
handling, PostgREST, connection pooling and Supabase's managed `auth` schema
are emulated, not reproduced. Before going live, the checks in §5 should be
re-run against a real project. See
`docs/SUPABASE_MIGRATION.md` §"Outstanding verification".

---

## 9. Future deployment requirements

Not needed for Phase 1; recorded so they are not discovered late.

- **Edge Functions** — `supabase functions deploy <name>`. Each function's
  secrets are set with `supabase secrets set NAME=value`.
- **AI provider credentials** — stored as Edge Function secrets only. They must
  never reach the client and never be written to any database row.
- **Scheduled cleanup** — the retention sweep (purging expired share links)
  needs `pg_cron` or a scheduled Edge Function. Deliberately not implemented
  in Phase 1.
- **Storage** — no bucket is created. The approved policy is process-then-
  discard, so documents are handled in memory inside a function. If that ever
  changes, a private bucket with user-scoped paths and short-lived signed URLs
  is required, and it needs a fresh owner decision.

---

## 10. Verification already carried out on the hosted database

These checks ran against `ppswtryoescehrytxvsh` on 2026-10-23. Each test ran
inside a transaction that was rolled back, so **no test data persisted** — a
follow-up count confirmed 0 rows in every table and 0 users.

| Check                                         | Expected      | Actual                         |
| --------------------------------------------- | ------------- | ------------------------------ |
| Tables created                                | 9             | 9                              |
| RLS enabled on all tables                     | true          | true                           |
| Policy count per table                        | matches local | matches local                  |
| Profile auto-created on user insert           | yes           | yes (`display_name` populated) |
| User A sees only own quizzes                  | 1 of 2        | 1                              |
| User B sees A's answer keys                   | 0             | 0                              |
| User B sees A's questions                     | 0             | 0                              |
| anon sees quizzes / answer keys / share links | 0             | 0                              |
| Client sees `usage_counters`                  | 0             | 0                              |
| Client can reset own access count             | no            | 0 rows updated                 |
| Client can reset own quota                    | no            | 0 rows updated                 |
| Client can insert an attempt with a score     | no            | **rejected (42501)**           |
| Valid share token resolves                    | 1 row         | 1                              |
| Expired / revoked / unknown token resolves    | 0             | 0                              |
| Access count increments 1 then 2              | yes           | 1, then 2                      |
| Increment on expired token                    | null          | null                           |
| `soft_delete_quiz` on own quiz                | true          | true                           |
| `soft_delete_quiz` on other / missing quiz    | false         | false                          |

The one result worth highlighting: the attempt insert was rejected with
`42501 new row violates row-level security policy for table "quiz_attempts"`.
That is the "clients cannot supply their own scores" control firing on real
Supabase, not only in the local engine.
