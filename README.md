# Quizzle

AI-assisted quiz generator. React Native (Expo) app targeting web first, with
iOS and Android planned.

> **Status:** application foundation complete. Google sign-in is implemented and
> configured, but **the sign-in flow has not yet been completed end to end** —
> see [Firebase setup](docs/FIREBASE_SETUP.md). Firestore and the server-side API
> layer are not implemented.

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

# 3. Create your environment file
cp .env.example .env

# 4. Start the web app
npm run web
```

Then open the URL Expo prints in the terminal.

If `npm install` fails with an `ERESOLVE` peer-dependency error (some npm
versions are stricter), retry with:

```bash
npm install --legacy-peer-deps
```

### Configure `.env`

`npm run web` will start without it, but Google sign-in will show a
**"Finish Firebase setup"** checklist naming whatever is missing.

Fill the four required values from **Firebase Console → Project settings →
General → Your apps → SDK setup and configuration → Config**:

| Variable                           | Example                           |
| ---------------------------------- | --------------------------------- |
| `EXPO_PUBLIC_FIREBASE_API_KEY`     | `AIza…`                           |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project-id.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID`  | `your-project-id`                 |
| `EXPO_PUBLIC_FIREBASE_APP_ID`      | `1:…:web:…`                       |

Two more are recommended: `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` and
`EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`.

> `EXPO_PUBLIC_*` values are **inlined at build time**.
> **Restart the dev server after editing `.env`** — changes are not hot-reloaded.

`.env` is gitignored. Only `.env.example` (placeholders) is committed. Never
commit real credentials.

You must also, in the Firebase Console:

1. **Enable** Authentication → Sign-in method → **Google**
2. Add your origin under Authentication → Settings → **Authorized domains**
3. Complete the **OAuth consent screen** (Google Cloud) — an incomplete consent
   screen is a common cause of a Google **403** on sign-in

Full walkthrough, including the 403 troubleshooting guide:
[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md).

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
App.tsx              App shell, Firebase auth state
screens/             SignIn, Generate, History/Share/Account placeholders
components/          Shared UI
services/            firebase.ts (config + diagnostics), auth.ts, storage
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
[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md).

**"Finish Firebase setup" checklist.** One or more required variables are
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

---

## Security

Firebase **web** config is public by design — it ships in every Firebase web
app's client bundle and grants no access on its own. Access is enforced by
Firestore security rules, the Authorized Domains allowlist, and (later) App
Check.

Never put an AI provider key, a Firebase service-account key, or any server
secret in `.env`. Those belong in the server-side API layer, which is not yet
implemented.

**Firestore security rules do not exist yet** — there is no data-access control
until they are written.
