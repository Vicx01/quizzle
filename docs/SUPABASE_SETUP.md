# Quizzle — Supabase Setup Guide

How to create and configure the Supabase project that the migrations in
`supabase/migrations/` are written against.

**Status of this document:** written during Phase 1 (database foundation).
The steps below have **not** been performed — no Supabase project has been
created yet, and no credentials exist in this repository. Everything in
`supabase/migrations/` is verified against a local PostgreSQL engine instead
(see "How the migrations are verified" below).

---

## 1. What you (the owner) must do vs. what is already done

| Step                                       | Who     | Status                |
| ------------------------------------------ | ------- | --------------------- |
| Write the database schema and RLS policies | Agent   | **Done**              |
| Write and run database/security tests      | Agent   | **Done** (74 passing) |
| Create the Supabase project                | **You** | Not started           |
| Apply migrations to a project              | **You** | Not started           |
| Provide project URL + anon key for `.env`  | **You** | Not started           |
| Configure Google OAuth                     | **You** | Later phase           |
| Wire the app to Supabase                   | Agent   | Later phase           |

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
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

The exact names will be confirmed when `services/supabase.ts` is written.
Supabase Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` automatically — you do not
set those.

---

## 4. Applying migrations

Migrations live in `supabase/migrations/` and are plain PostgreSQL, applied in
filename order:

```
20261023000001_core_schema.sql
20261023000002_rls_policies.sql
20261023000003_retention.sql
20261023000004_share_resolution.sql
20261023000005_soft_delete.sql
```

Postgres (not Supabase) tracks which migrations have already run, in the table
`supabase_migrations.schema_migrations`.

### Option A — SQL Editor (no installation required)

1. Dashboard → **SQL Editor** → **New query**.
2. Paste the contents of `20261023000001_core_schema.sql`, run it.
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
