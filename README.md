# Quizzle

AI-assisted quiz generator. React Native (Expo) app targeting web first, with
iOS and Android planned.

> **Status:** application foundation complete. The database layer has moved to
> Supabase PostgreSQL, and **Supabase Auth (Google only) is the sole
> authentication provider** — Firebase Auth has been removed. See
> [Supabase setup](docs/SUPABASE_SETUP.md).
>
> Not yet done: the server-side API layer (which would call an AI provider) is
> not implemented, and no quiz generation or storage exists yet.

---

## Requirements

| Tool | Version                           |
| ---- | --------------------------------- |
| Node | 20 LTS or newer (developed on 22) |
| npm  | 10 or newer                       |
| Git  | any recent version                |

No global Expo CLI is needed — use the bundled `npx expo`.

---

## Run locally

```bash
# 1. Clone and switch to the working branch
git clone https://github.com/Vicx01/quizzle.git
cd quizzle
git checkout arena/9131a5e6-quizzle

# 2. Install dependencies
npm install
```

**3. Create your environment file.** There is **no committed template** — you
create `.env` in the project root yourself. Pick the command for your shell:

| Shell                               | Command                        |
| ----------------------------------- | ------------------------------ |
| macOS / Linux / Git Bash on Windows | `touch .env`                   |
| Windows **Command Prompt (cmd)**    | `type nul > .env`              |
| Windows **PowerShell**              | `New-Item .env -ItemType File` |

> `cp` does **not** exist in Windows Command Prompt or PowerShell — it is a
> Unix command. Using it there produces
> `'cp' is not recognized as an internal or external command`.
> If you have Git for Windows installed, **Git Bash** accepts `cp` and all the
> other Unix commands unchanged.

Open `.env` in an editor and add the values listed under
[Configure `.env`](#configure-env).

Then:

```bash
# 4. Start the web app
npm run web
```

Open the URL Expo prints in the terminal.

If `npm install` fails with an `ERESOLVE` peer-dependency error (some npm
versions are stricter), retry with:

```bash
npm install --legacy-peer-deps
```

### Configure `.env`

`npm run web` will start without it, but Google sign-in will show a
**"Finish Supabase setup"** checklist naming whatever is missing.

Fill the two required values from **Supabase Dashboard → Project Settings →
API**:

| Variable                        | Example                             |
| ------------------------------- | ----------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | `https://<project-ref>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the **anon / publishable** key      |

> **Only the anon (publishable) key belongs here.** The service-role key bypasses
> Row Level Security on every table and must never be placed in an
> `EXPO_PUBLIC_*` variable — the app checks for that mistake and refuses to
> report a healthy configuration if it finds one.

> `EXPO_PUBLIC_*` values are **inlined at build time**.
> **Restart the dev server after editing `.env`** — changes are not hot-reloaded.

`.env` is gitignored and **no template is committed** (`.env.example` was removed
at the owner's request). Never commit real credentials. Verify that `.env` is
ignored and untracked:

```bash
git check-ignore -v .env          # prints the matching .gitignore rule
git ls-files | grep -i '^\.env'   # prints nothing
```

You must also, in the Supabase Dashboard:

1. **Enable** Authentication → Providers → **Google** and set the OAuth client
   ID and secret
2. Add your origin under Authentication → URL Configuration → **Redirect URLs**
3. Complete the **OAuth consent screen** (Google Cloud) and add
   `https://<project-ref>.supabase.co/auth/v1/callback` to the Google client's
   **Authorized redirect URIs** — an incomplete consent screen is a common cause
   of a Google **403** on sign-in

Full walkthrough, including the 403 troubleshooting guide:
[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

---

## Scripts

| Command                | What it does                      |
| ---------------------- | --------------------------------- |
| `npm run web`          | Start the web dev server          |
| `npm start`            | Expo dev server (pick a platform) |
| `npm run android`      | Run on Android emulator/device    |
| `npm run ios`          | Run on iOS simulator (macOS only) |
| `npm test`             | Jest test suite                   |
| `npm run test:watch`   | Jest in watch mode                |
| `npm run typecheck`    | TypeScript, no emit               |
| `npm run lint`         | ESLint                            |
| `npm run lint:fix`     | ESLint with autofix               |
| `npm run format`       | Prettier check                    |
| `npm run format:write` | Prettier write                    |
| `npm run build:web`    | Production web export             |

---

## Project layout

```
App.tsx              App shell, Supabase auth state
screens/             SignIn, Generate, History/Share/Account placeholders
components/          Shared UI
services/            auth.ts, authSupabase.ts, supabase.ts, configStatus.ts
theme/               Design tokens and ThemeContext
hooks/               Shared hooks (e.g. useNetworkStatus)
docs/                Setup guides
```

Deeper context: [ARCHITECTURE.md](ARCHITECTURE.md),
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md),
[DESIGN_BRIEF.md](DESIGN_BRIEF.md),
[NEXT_STEPS.md](NEXT_STEPS.md).

---

## Troubleshooting

**Sign-in shows a Google 403.** Usually means the app is inside an embedded
iframe preview, or the OAuth consent screen is incomplete. Open the app in a
normal browser tab first. See
[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

**"Finish Supabase setup" checklist.** One or more required variables are
missing or still placeholders. Fix `.env` and **restart the server**.

**Stale config after editing `.env`.** Same cause — `EXPO_PUBLIC_*` is inlined
at build time. Restart the dev server; add `--clear` to also clear the bundler
cache:

```bash
npx expo start --web --clear
```

**Port already in use.** Pick another port:

```bash
npx expo start --web --port 8082
```

### Windows notes

**`.env` may have been saved as `.env.txt`.** Notepad appends `.txt` by default,
and File Explorer refuses to create files whose names start with a dot. A file
named `.env.txt` is ignored entirely, so the app will still report missing
values. Check the real name:

```
dir .env*
```

If `.env.txt` appears, rename it:

```
ren .env.txt .env
```

**Line endings.** Git for Windows may check files out with CRLF endings. If a
value in `.env` looks correct but is rejected, re-save the file with LF endings,
or clone with `git clone --config core.autocrlf=false`.

---

## Security

The Supabase **anon / publishable** key is public by design — it ships in the
client bundle and grants no access on its own. Access is enforced by Row Level
Security, which is enabled on every table, and by the redirect allowlist.

**Never put the Supabase service-role key in `.env`.** It bypasses Row Level
Security on every table; the app detects it and refuses to report a healthy
configuration. The same goes for an AI provider key, a database password, or any
other server secret — those belong in the server-side API layer, which is not yet
implemented.

**Data access is controlled by Supabase Row Level Security.** RLS is enabled on
all nine tables, defaults to deny, and is covered by 74 executed tests
(`npm run test:db`). Correct answers live in a table with no client-readable
policy, so taking a quiz never grants read access to its answer key.
