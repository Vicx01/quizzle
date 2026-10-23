# Quizzle — Next Steps

**Current phase:** Supabase migration — Phase 4 (Google-only Supabase Auth) is **CODE COMPLETE**. Supabase is the sole authentication provider; Firebase Auth has been deleted. **A real-browser Google sign-in remains outstanding.**

**Status:** The database foundation (Phases 1–3) is applied to the hosted project and verified on it. Supabase Auth is the only auth path in the code — the `EXPO_PUBLIC_AUTH_PROVIDER` switch is gone, `services/firebase.ts` is deleted, and no application code references Firebase. Every automated check passes. **A real Google OAuth flow has never been executed**, because this sandbox has no network path to Google or to the Supabase host.

**Last updated:** 2026-10-23

**Branch:** `arena/9131a5e6-quizzle`

---

## Current status — Supabase Auth is the sole provider (2026-10-23)

### What changed

- `services/auth.ts` is **Supabase-only**. No dispatcher, no provider branching,
  no `EXPO_PUBLIC_AUTH_PROVIDER`.
- `services/firebase.ts` and `services/__tests__/firebase.test.ts` **deleted**.
- `AppUser` lost its now-meaningless `provider` field; the `AuthProvider` union
  type is gone. Screens use `{ id, email, displayName, photoURL }`.
- User-facing copy updated: the setup panel reads "Finish Supabase setup" and
  points at the Supabase Dashboard, not the Firebase Console.
- `docs/FIREBASE_SETUP.md` is now a superseded stub.

### Google-only is preserved

Verified on the hosted project through the API: `external_google_enabled: true`,
client ID and secret set, `external_google_skip_nonce_check: false` (nonce check
**on**, the more secure setting), `external_email_enabled: false` and
`external_phone_enabled: false`. Google is the only way in.

### Security checks that passed

- RLS re-verified live: **9/9 tables** with `rowsecurity = true` and unchanged
  policy counts.
- Bundle scan of the production web build: **`firebase` — 0 occurrences**,
  `AIzaSy` — 0, `EXPO_PUBLIC_FIREBASE_*` — 0. The only client env vars
  referenced anywhere in source are `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- The `sb_secret_` / `service_role` strings in the bundle are the guard's own
  literals (in `looksLikeServiceRoleKey` and in the SDK's key check), not a key.
- `getSupabaseConfigStatus()` still refuses to report healthy if the anon slot
  holds a service-role key.

### OPEN — the one blocking security action

**The Google OAuth client secret may not have been rotated after an earlier
exposure.** The Supabase API returns the current secret value but exposes no
creation or rotation timestamp, so rotation **cannot be verified from here**.

**Action required (owner, ~2 minutes):**

1. Google Cloud Console → APIs & Services → Credentials → the OAuth client →
   **rotate the client secret**.
2. Supabase Dashboard → Authentication → Providers → Google → paste the **new**
   secret and save.

Until that is done, the live OAuth migration should not be considered complete,
regardless of how the code reads.

### OPEN — real-browser verification

No Google sign-in has ever run. The sandbox cannot reach
`accounts.google.com` **or** `ppswtryoescehrytxvsh.supabase.co` (both return
connection failures), so no interactive OAuth flow and no live PostgREST check
is possible here. Passing unit tests and a clean bundle build are **not**
evidence that the live flow works.

**Action required (owner):**

1. Add to your local `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://ppswtryoescehrytxvsh.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
   ```
2. Restart the dev server (`EXPO_PUBLIC_*` is inlined at build time) and open
   the app in a **real browser tab** — Google blocks embedded previews.
3. Confirm: sign-in works, the Account screen shows your name/email/photo,
   sign-out returns to the sign-in screen, and a page refresh keeps you signed
   in.
4. If the current host is rejected, add it under Authentication → URL
   Configuration → Redirect URLs. The list currently covers
   `http://localhost:8081`, `http://localhost:19006` and
   `https://8081-*.e2b.app`; **the sandbox host changes between sessions**, so a
   new one must be added each time.

---

## Next phase — Phase 5: Profiles + quiz persistence

Per `docs/SUPABASE_MIGRATION.md` §13, the phase after authentication is:

> **5 | Profiles + quiz persistence | Not started | Owner CRUD, replaces the
> prototype alert**

This is next because it is the first phase that makes the deployed schema do
work for the user: the `profiles`, `quizzes` and `questions` tables exist and are
protected by RLS, but nothing writes to them yet — the Generate screen still
shows a prototype alert. Authentication had to land first, because every one of
those tables is scoped by `auth.uid()`.

**Explicitly out of scope for Phase 5:** AI provider integration, document
processing, and Storage. Those are Phases 7–8 and remain deferred.

---

## Verification results (actual, this phase)

| Check               | Command                            | Result                             |
| ------------------- | ---------------------------------- | ---------------------------------- |
| App tests           | `npx jest`                         | **150 passed** / 14 suites         |
| Database tests      | `npm run test:db`                  | **74 passed**, 0 failed, 0 skipped |
| Typecheck           | `./node_modules/.bin/tsc --noEmit` | clean                              |
| Lint                | `npx eslint . --ext .ts,.tsx`      | 0 errors, 7 pre-existing warnings  |
| Prettier            | `npx prettier --check .`           | clean                              |
| Web bundle          | `npx expo export --platform web`   | **271 modules, 739 KB**            |
| Live RLS            | MCP `execute_query`                | 9/9 tables RLS-enabled             |
| Real Google sign-in | —                                  | **NOT VERIFIED — owner action**    |

The bundle shrank from 287 modules / 1.5 MB to **271 modules / 739 KB** —
removing Firebase Auth roughly halved it.

---

## Previous status — Google sign-in VERIFIED (2026-10-23) — SUPERSEDED

> ## ⚠️ Historical section — do not read as current
>
> Everything below this banner describes the **Firebase** sign-in flow, which
> **no longer exists** in the codebase. Firebase Auth was removed on 2026-10-23
> and replaced by Supabase Auth (Google only).
>
> The verification recorded here — that the owner completed a live Google
> sign-in — applied to **Firebase**, and **does not carry over to Supabase**.
> Supabase sign-in is a different integration with different redirect handling
> and has never been executed. See the "OPEN — real-browser verification"
> section at the top of this file for what the owner needs to do now.

**The owner ran the flow and confirmed a successful Google sign-in.** This was
the last open blocker from Phase 3: authentication is no longer a question mark,
and every user-scoped feature is now unblocked.

Confirmed:

- Firebase credentials live in `.env` (gitignored, never committed).
- `getFirebaseConfigStatus()` returns `ok: true`; Expo inlines all values.
- Google sign-in completes and lands on the Generate screen.

### Gaps found while reviewing the now-working flow

1. ~~**`signOut()` is exported but never called**~~ — **DONE (2026-10-23)**: the
   Account screen shows the signed-in identity and offers Sign out, wired to
   Firebase Auth. Covered by 21 new tests.
2. **Firestore is initialised (`getFirebaseFirestore()`) but never used.** There
   is no data layer. **Nothing is written to Firestore** — deliberate until
   security rules exist.
3. **Firestore security rules are WRITTEN but NOT DEPLOYED and NOT VERIFIED.**
   `firestore.rules` plus an emulator test suite await review. **Nothing is
   written to Firestore and no rules are deployed** until they have been
   reviewed and verified. Kept as a separate step at the owner's request.
   See "Firestore security rules (awaiting review)" below.
4. **Native (iOS/Android) auth has never been built.**

### Firestore security rules (awaiting review)

`firestore.rules` is written and covers all five collections in
ARCHITECTURE.md §3.9, with a deny-by-default catch-all:

| Collection     | Client access                                                  |
| -------------- | -------------------------------------------------------------- |
| `users/{uid}`  | read/write own doc only; email immutable; client delete denied |
| `quizzes`      | **owner only** — no public read path exists                    |
| `quizAttempts` | own attempts, or attempts on a quiz you own                    |
| `shareLinks`   | read by anyone; **no client writes** (server-only)             |
| `rateLimits`   | **no client access at all**                                    |

**Shared quizzes are server-mediated.** A share link grants no direct read of
the quiz, because the document embeds `questions[].correctAnswer` and rules
cannot redact fields. See `docs/SHARE_LINK_API.md` (contract only — the API is
not implemented).

Ownership always derives from `request.auth.uid`; a client-supplied `ownerId`
cannot grant access, and `ownerId` is immutable so a quiz cannot be transferred
by a write.

**NOT VERIFIED — the rules have never been executed.** Static review found and
fixed two defects (see CHANGELOG 2026-10-23), but nothing has been run.

The emulator genuinely cannot run in this sandbox. This was verified, not
assumed: a JDK was obtained via the `jdk4py` PyPI wheel and `firebase-tools` was
installed from npm, but the emulator JAR download fails — both official hosts
(`storage.googleapis.com`, `dl.google.com`) are network-blocked. The two
Java-free emulators were evaluated and rejected because neither implements
security rules, which is precisely what is under test.

To verify locally — **Windows PowerShell**, checking what is already installed
first:

```powershell
# 1. Java (the Firestore emulator needs it). Already present?
java -version
# If that errors, install Temurin 21 LTS, then OPEN A NEW SHELL:
winget install EclipseAdoptium.Temurin.21.JDK
# (Fallback if winget is unavailable: https://adoptium.net/temurin/releases/)

# 2. Firebase CLI. Already present?
firebase --version
# If that errors:
npm install -g firebase-tools

# 3. Sign in once (opens a browser):
firebase login

# 4. Terminal 1 — start the emulator and leave it running:
firebase emulators:start --only firestore --project quizzle-rules-test

# 5. Terminal 2 — run the rules tests:
npm run test:rules
```

On macOS/Linux the same sequence works with `cp`-style shells; install Java via
your package manager (e.g. `brew install temurin@21`).

**45 tests are written; 0 have been executed.** They are excluded from `npm test`
(`testPathIgnorePatterns`) so a missing emulator cannot fail the app suite, and
they must not be counted as passing until they actually run.

**Answer-key exposure resolved (v3).** `isSharedQuiz()` has been removed, so no
client can read a quiz it does not own. Sharing is now the server API's job
(`docs/SHARE_LINK_API.md`). Only deploy after review:

```bash
firebase deploy --only firestore:rules
```

### Remaining work before shared quizzes can be safe

Removing the public read path makes the rules safe, but it also means **sharing
does not work at all yet**. The following must exist before the feature is
turned on:

1. **Build the server-side API layer** (not started) implementing
   `docs/SHARE_LINK_API.md`: `GET /api/share/:token` and
   `POST /api/share/:token/attempts`.
2. **Allowlist, never denylist** the share response. A denylist silently leaks
   every field added to the quiz document later.
3. **Grade server-side.** The client must never receive the answer key before
   submitting, or it could grade itself and leak answers.
4. **Generic 404 for every failure** — expired, revoked and non-existent must be
   indistinguishable, or the endpoint becomes a token oracle.
5. **Verify the rules** against the official emulator, then deploy.
6. **Decide** whether `shareLinks` stays world-readable (open question 1 in
   `docs/SHARE_LINK_API.md`), and whether share attempts are recorded
   anonymously (open question 2).

### Environment file convention (2026-10-23)

There is **no committed template**. `.env.example` was removed at the owner's
request, so `.env` is created by hand in the project root and is the single
environment file.

- `.env` and every `.env.*` variant are gitignored with **no exceptions** (the
  old `!.env.example` negation is gone).
- `EXPO_PUBLIC_FIREBASE_*` names and the config/placeholder-detection logic in
  `services/firebase.ts` are unchanged.
- Verify with `git check-ignore -v .env` (prints a rule) and
  `git ls-files | grep -i '^\.env'` (prints nothing).

### Verification details still to record

Ask the owner, fill in below, then delete this note:

- popup flow, or did it fall back to redirect?
- did the session survive a page reload?
- which origin was used — `localhost`, or the `8080-….e2b.app` preview host?
- does the user appear in Firebase Console → Authentication → Users?

---

## Phase 0 (complete)

Discovery interview. Confirmed: university students, Notion as visual reference, minimal direction, centered single-column home, light + dark themes, balanced web/mobile, no existing assets.

## Phase 1 (complete)

Architecture documented in `ARCHITECTURE.md` (provisionally approved): Expo + React Native Web + TypeScript, Expo Router, Firebase Auth (Google), Firestore, server-side API layer, replaceable AI provider (GroqCloud → NVIDIA NIM → Mistral).

## Phase 2 (complete)

Design system defined in `DESIGN_BRIEF.md` and approved with conditions. Generate-screen prototype built and reviewed.

## Phase 3 (complete — application foundation)

### What works

- Project structure: `components/`, `screens/`, `theme/`, `hooks/`, `services/`, `types/`, `tests/`
- TypeScript strict mode, ESLint, Prettier, Jest all configured and passing
- Design tokens implemented (light + dark), theme context with persistence
- Reusable components: Button, Input, SegmentedControl, Toggle, TabBar, Dialog, Notification, Progress, States
- Responsive layouts via `useResponsive()` / `useWindowDimensions()`
- Sign-in screen (Google) per DESIGN_BRIEF §12.1
- App shell with auth state, tab navigation (Generate, History, Share, Account)
- Loading / empty / error / offline states
- **74 automated tests passing** across 9 suites

### Verified by running

| Check      | Command                       | Result                   |
| ---------- | ----------------------------- | ------------------------ |
| Typecheck  | `npx tsc --noEmit`            | 0 errors                 |
| Lint       | `npx eslint . --ext .ts,.tsx` | 0 errors, 8 warnings     |
| Format     | `npx prettier --check .`      | clean                    |
| Tests      | `npx jest`                    | **89 passed** / 9 suites |
| Web bundle | `npx expo start --web`        | 266 modules, HTTP 200    |

### Bugs fixed during this phase

1. Removed a **fabricated usage statistic** (`Daily generations: 12 / 50`) — quota is now data-driven and renders nothing when unknown.
2. Fixed a **Rules-of-Hooks violation** in `App.tsx`.
3. Replaced web-only **`localStorage` with AsyncStorage** (would have crashed on native).
4. Fixed **`Toggle` ignoring its `style` prop**.
5. Removed dead code (`DialogWithTheme`, `SignInScreenWithTheme`, unused imports).
6. **WCAG AA contrast resolved** (see decision 1 above) — including the invisible
   toggle track and the placeholder-colour error.

### Still not verified (unchanged)

- **Visual rendering** — no browser in this sandbox; the bundle compiles but
  appearance is unconfirmed. **This is the main remaining gap.**
- **Native iOS/Android** — never built or run. No native support is claimed.
- **Firebase Auth** — **VERIFIED**: the owner completed a live Google sign-in.
- **Firestore** — initialised but unused; **no security rules exist**, so there is
  no data-access control.
- **AI provider access** — no keys, no live calls.

**Do not begin AI-provider integration** until accessibility and visual review
are complete.

### Failed approaches — do not retry

- `jest-expo/jest-config` does not exist in v58 → use `@react-native/jest-preset`.
- Do **not** override Jest `testEnvironment` with `jsdom` → `__fbBatchedBridgeConfig is not set`.
- Do **not** mock all of `react-native` → RNTL cannot detect host components.
- Do **not** call `Dimensions.get('window')` at module scope → crashes Jest.
- `react-native/no-unused-styles` is incompatible with `getStyles(colors)` factories → disabled.
- `react-native/no-color-literals` accepts no options in this version.

---

## Decisions needed from the owner (blocking)

### 1. WCAG AA contrast — RESOLVED (2026-10-22)

Both deviations were fixed by splitting the overloaded tokens rather than by
pinning the failures. Details and the full measurement table are in
`DESIGN_BRIEF.md` §16.

- **Control borders:** `border` split into `border` (decorative, stays subtle) and
  `borderControl` (`#8F8F8F` light / `#666666` dark, >= 3:1). Applied to inputs,
  secondary buttons, segmented options, source tabs, upload drop zone, and the
  toggle track.
- **Muted text:** `textTertiary` raised to `#707070` / `#8A8A8A` (>= 4.5:1) and
  split from the new `textDisabled` (`#999999` / `#525252`), which covers
  disabled controls and is exempt from WCAG 1.4.3.

Two related bugs were fixed at the same time:

- The **toggle track** was invisible when off (1.18:1). It now uses
  `borderControl` (3.02:1).
- Placeholder contrast was recomputed against the **input surface**, not the page
  background — `#767676` passes on white (4.54:1) but fails on `#F7F7F7` (4.24:1),
  so `#707070` was chosen instead.

All 36 contrast assertions now pass as real requirements, not pins.

### 2. Supabase credentials + a real sign-in — BLOCKING

**This is the only thing preventing a verified sign-in.** Supply
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in your `.env`,
then complete the browser verification described in "OPEN — real-browser
verification" above. Google sign-in through Supabase remains unverified until
then.

There are no Firebase variables any more; those were removed with Firebase Auth.

### ~~3. Navigation: keep custom shell or migrate to Expo Router?~~ — SETTLED

**Decision: keep the existing custom tab shell.** The `expo-router` plugin
registration was removed from `app.json` (it was dead config for routing that is
not in use, and the source of an `ajv` dependency conflict). The `expo-router`
package remains installed but intentionally unused; do not migrate without a
concrete requirement.

---

## Not verified (explicitly)

- **Supabase Google sign-in** — **NEVER EXECUTED**. The sandbox cannot reach
  `accounts.google.com` or the Supabase host. Unit tests and a clean bundle are
  not evidence that the live flow works. Owner action required.
- **Visual rendering** — no browser in this sandbox; bundle compiles but
  appearance is unconfirmed.
- **Native iOS/Android** — never built or run. No native support is claimed.
- **PostgREST request behaviour** — the live database checks ran as SQL roles,
  not through PostgREST, and the host is unreachable from here. The app's actual
  client queries are unproven.
- **Firestore rules** — 45 tests written, never executed. Superseded by
  Supabase RLS; no application code uses Firestore.
- **AI provider access** — no keys, no live calls.

---

> **Phase numbering note.** This section predates the Supabase migration plan
> and uses an older numbering in which "Phase 4" meant accessibility review. In
> `docs/SUPABASE_MIGRATION.md` §13 — the current plan — **Phase 4 is Supabase
> authentication (now code-complete)** and **Phase 5 is profiles + quiz
> persistence**. The list below is retained because the accessibility gate it
> describes is still genuinely outstanding and still blocks AI work; only the
> heading was stale.

## Accessibility and visual review — outstanding gate before AI work

**Scope note:** AI-provider integration is **deferred by owner instruction** until
accessibility and visual review are complete. This gate must finish before any
backend/AI phase starts.

### Accessibility and visual review (do this first)

1. Owner reviews the live preview in **both themes at mobile and desktop widths**
   and confirms the new control borders (`#8F8F8F` / `#666666`) look right — they
   are noticeably heavier than the previous `#E5E5E5` / `#2A2A2A`.
2. Owner confirms the **toggle is now visible when off** and that the mid-grey
   track reads correctly as a disabled state.
3. Owner confirms the raised `textTertiary` (`#707070` / `#8A8A8A`) still reads as
   clearly _muted_ relative to `textSecondary` — in light mode the two are now
   closer than before (4.95:1 vs 5.74:1), which is unavoidable if placeholders must
   meet 4.5:1.
4. Keyboard/focus-visible pass over every interactive control.
5. Screen-reader labels verified on the sign-in and generate screens.

### 4B — Backend and AI (only after 4A is signed off)

6. Firebase project created; `EXPO_PUBLIC_FIREBASE_*` configured.
7. Google sign-in **verified working on web** (popup + redirect).
8. Firestore created with security rules deployed (ownership enforced server-side).
9. Server-side API layer scaffolded with the replaceable `AIProvider` interface (ARCHITECTURE.md §3.6).
10. **AI provider free-tier verified with a live account** before any provider-specific code — order: GroqCloud → NVIDIA NIM → Mistral. No paid usage without explicit approval.
11. `expo-document-picker` integrated to replace the web-only `<input type="file">` in `Generate.tsx`.
12. Backend quota endpoint wired to the `quota` prop so the indicator shows real data.
13. PDF/DOCX/TXT extraction validated server-side; scanned-PDF detection confirmed.
14. LaTeX rendering validated (KaTeX web; native renderer evaluated).
15. CI (GitHub Actions) running lint + typecheck + tests on push.
16. Native build attempted (EAS), with results recorded honestly — including failures.

---

## Outstanding commands

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run format         # prettier --check
npm test               # jest
npm run web            # expo start --web
```

Not yet runnable / not yet run:

- ~~Firebase Auth live test~~ **DONE — owner confirmed a successful sign-in.**
- Firestore rules — **written, awaiting review**: `firestore.rules` + `tests/rules/firestore.rules.test.ts`. Run `npm run test:rules` against the emulator, then review, then deploy. No user data is stored until then.
- AI provider live calls (needs keys)
- `eas build` for native (needs EAS account)
- Visual/browser verification (needs a browser)
- PDF/DOCX extraction tests (needs server-side layer)
- LaTeX rendering tests (needs renderer integration)
