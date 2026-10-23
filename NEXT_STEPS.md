# Quizzle — Next Steps

**Current phase:** Supabase migration — Phase 4 (Google-only Supabase Auth) is IMPLEMENTED and AWAITING OWNER VERIFICATION.

**Status:** The database foundation is applied to the hosted project and verified on it. **Supabase authentication is now implemented but NOT yet run.** Google OAuth is enabled on the project; the app can sign in through Supabase by setting `EXPO_PUBLIC_AUTH_PROVIDER=supabase`, with Firebase remaining the default until the owner confirms Supabase sign-in works.

**Last updated:** 2026-10-23

**Branch:** `arena/9131a5e6-quizzle`

---

## Current status — Supabase database foundation COMPLETE (2026-10-23)

Phase 1 of the Firebase → Supabase migration is done and deployed. It is
**database-only**: no application code changed, and Firebase still handles
sign-in.

### What was built

- Five migrations in `supabase/migrations/` creating nine tables, RLS policies,
  retention eligibility, share-link resolution and soft delete.
- `tests/database/` — 74 executed tests (`npm run test:db`) running the real
  migrations against real PostgreSQL (PGlite, WebAssembly). **No Docker, no
  local Supabase stack, no credentials, no network.**
- `docs/SUPABASE_SETUP.md` — the dashboard steps only you can perform.

### Project

`quizzle` — ref `ppswtryoescehrytxvsh`, region `eu-west-1`, PostgreSQL 17.11,
status `ACTIVE_HEALTHY`. Project URL
`https://ppswtryoescehrytxvsh.supabase.co`.

### Security model in one paragraph

RLS is enabled on all nine tables and defaults to deny. `usage_counters` and
`generation_log` have **no client policies at all**. Correct answers live in a
physically separate table (`question_answer_keys`) from the question text, so
the future shared-quiz function cannot leak them with a careless `select *`.
Share tokens are stored only as SHA-256 hashes. Attempts are written
exclusively by server code, so a client can never supply its own score.
Anonymous attempts are supported with `user_id = null`.

### Test results (actual)

| Suite                        | Count | Result                             |
| ---------------------------- | ----- | ---------------------------------- |
| Database (`npm run test:db`) | 74    | **74 passed, 0 failed, 0 skipped** |
| App (`npm test`)             | 149   | 149 passed, 14 suites              |
| Typecheck                    | —     | clean                              |
| Lint                         | —     | 0 errors, 7 pre-existing warnings  |
| Prettier                     | —     | clean                              |

The database suite is **mutation-checked**: breaking any of six controls
(dropping RLS, removing the ownership check, exposing answer keys, letting
clients edit counters or access counts, or removing the 30-day share-link
limit) makes it fail. The tests are not vacuous.

### Verified on the hosted project (2026-10-23)

All five migrations were applied to `ppswtryoescehrytxvsh` and the security
behaviour was then tested **on that live database**. Every check ran inside a
transaction that was rolled back; a follow-up count confirmed 0 users and 0
rows, so nothing persisted.

Confirmed live: RLS enabled on all nine tables with the expected policy counts;
cross-user isolation; anonymous denial; `usage_counters` invisible to clients;
clients unable to reset their own access counts or quotas; a client attempt to
insert a quiz score **rejected with `42501`**; share tokens resolving correctly
when valid and returning nothing when expired, revoked or unknown; access
counts incrementing 1 then 2; and `soft_delete_quiz` returning `true` for the
owner and `false` otherwise.

The profile-bootstrap trigger also fires correctly against the real GoTrue
`auth.users` schema — a behaviour the local engine could not prove, because it
only emulates that schema.

Full results are tabulated in `docs/SUPABASE_SETUP.md` §10.

### Supabase auth — code complete, never executed

Google OAuth is enabled on the hosted project (verified through the API:
`external_google_enabled: true`, client ID and secret set, nonce check on).

What was built:

- `services/supabase.ts` — client construction and configuration diagnostics.
- `services/authSupabase.ts` — Google OAuth, session observation, sign-out,
  and scrubbing OAuth parameters from the URL after a redirect.
- `services/auth.ts` — now a **provider dispatcher** rather than Firebase code.
- A provider-neutral `AppUser` type, so no screen depends on either vendor's
  user shape.

**The migration switch is `EXPO_PUBLIC_AUTH_PROVIDER`.** Firebase is the
default; only the exact value `supabase` switches to Supabase, and any other
value (including a typo) falls back to Firebase. That keeps a working login at
all times and prevents two providers from being live at once.

### How you verify it

1. Add to your local `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://ppswtryoescehrytxvsh.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
   EXPO_PUBLIC_AUTH_PROVIDER=supabase
   ```
2. Restart the dev server (env vars are inlined at build time) and open the app
   in a real browser tab — not the embedded preview, which Google blocks.
3. Sign in with Google. If it fails, the error message names the fix.

If the current host is not on the redirect allow-list, sign-in will be rejected
and the message will tell you to add it under Authentication → URL
Configuration → Redirect URLs. The list currently covers
`http://localhost:8081`, `http://localhost:19006` and `https://8081-*.e2b.app`;
**the sandbox host changes between sessions, so a new one must be added each
time.**

### What is NOT verified

- **Supabase Google sign-in has never been executed.** The sandbox has no
  network path to Google, so no OAuth flow can run here. Only the owner can
  confirm it. Everything about the Supabase auth path is unproven until then.
- **PostgREST behaviour.** The hosted checks ran as SQL roles
  (`anon` / `authenticated` / `service_role`). They do not exercise PostgREST's
  request handling, so the app's actual client queries are still unproven.
- The 45 Firestore rules tests remain **written and unexecuted**.

---

## Previous status — Google sign-in VERIFIED (2026-10-23)

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

### 2. Firebase credentials — BLOCKING

**This is the only thing preventing sign-in.** Supply the four
`EXPO_PUBLIC_FIREBASE_*` values listed above and complete the Console steps in
`docs/FIREBASE_SETUP.md`. Google sign-in remains unverified until then.

### ~~3. Navigation: keep custom shell or migrate to Expo Router?~~ — SETTLED

**Decision: keep the existing custom tab shell.** The `expo-router` plugin
registration was removed from `app.json` (it was dead config for routing that is
not in use, and the source of an `ajv` dependency conflict). The `expo-router`
package remains installed but intentionally unused; do not migrate without a
concrete requirement.

---

## Not verified (explicitly)

- **Visual rendering** — no browser in this sandbox; bundle compiles but appearance is unconfirmed.
- **Native iOS/Android** — never built or run. No native support is claimed.
- **Firebase Auth** — **VERIFIED**: the owner completed a live Google sign-in.
- **Firestore** — initialised but unused; **no security rules exist**, so there is
  no data-access control.
- **AI provider access** — no keys, no live calls.

---

## Phase 4 acceptance criteria (next phase)

**Scope note:** AI-provider integration is **deferred by owner instruction** until
accessibility and visual review are complete. Phase 4 is therefore split: 4A
(accessibility + visual sign-off) must finish before 4B (backend/AI) starts.

### 4A — Accessibility and visual review (do this first)

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
