# Quizzle — Changelog

This file is append-only in spirit: add dated entries; do not erase earlier history. Distinguish code that exists from work merely proposed.

## 2026-10-22 — Repository reset for fresh project start

### Inspection of existing repository (before reset)

- Single commit `121e417` "feat: Initialize Quizzle AI project structure" on `main`; session branch `arena/9131a5e6-quizzle`, working tree clean.
- Tracked starter-template files removed: Vite + React 19 app (App.tsx, index.tsx, index.html, vite.config.ts, tsconfig.json, types.ts, package.json, README.md, metadata.json, .gitignore); components (ChatBot, HistoryView, ImageGenerator, Layout, MCQGenerator, Onboarding, QuizView); services (audioUtils, geminiService).
- Dependencies were react, react-dom, @google/genai with vite/typescript dev dependencies; README required a GEMINI_API_KEY and pointed to an AI Studio app — not aligned with the server-side-key, NIM/Groq/OpenRouter-evaluation direction in PROJECT_CONTEXT.md.

### Action taken

- Emptied the repository of all tracked starter-template files.
- Added the four project documents: PROJECT_CONTEXT.md, CHANGELOG.md, NEXT_STEPS.md, DESIGN_BRIEF.md.
- These are discovery/planning documents only. No implementation, automated tests, AI provider access, authentication, deployment, or retention mechanism is verified.

## 2026-10-22 — Phase 0 discovery complete

### Repository state (before reset)

- Single commit `121e417` "feat: Initialize Quizzle AI project structure"; session branch `arena/9131a5e6-quizzle`, working tree clean.
- Starter-template files removed: Vite + React 19 app (App.tsx, index.tsx, index.html, vite.config.ts, tsconfig.json, types.ts, package.json, README.md, metadata.json, .gitignore); components (ChatBot, HistoryView, ImageGenerator, Layout, MCQGenerator, Onboarding, QuizView); services (audioUtils, geminiService).
- The template required a client-side GEMINI_API_KEY and pointed to an AI Studio app — not aligned with the server-side-key, provider-evaluation direction in PROJECT_CONTEXT.md.

### Action taken

- Emptied the repository of all tracked starter-template files.
- Added the four project documents: PROJECT_CONTEXT.md, CHANGELOG.md, NEXT_STEPS.md, DESIGN_BRIEF.md.

### Discovery interview (Phase 0) — owner answers captured

- Intended users / use cases: university / college students — coursework, exam prep, lecture review.
- Visual references: Notion.
- Visual direction: minimal.
- Brand: none yet — guidance requested.
- Home-screen layout: centered single-column.
- Theme: both light and dark.
- Platform priority: balanced web and mobile.
- Existing work to preserve: nothing — start fresh.

### Status

- These documents capture requirements and proposed work.
- No source code, automated tests, live AI API calls, authentication, deployment, or retention mechanism is verified.
- Architecture (Expo + React Native Web + Firebase + server-side API layer) is proposed, NOT approved.
- AI providers (NVIDIA NIM, GroqCloud, mistral) are candidates, NOT verified.

### Failed approaches

- None recorded yet.

## 2026-10-22 — Phase 1 architecture documented

### Architecture (provisionally approved, awaiting owner sign-off)

- Expo + React Native + React Native Web + TypeScript; Expo Router; Firebase Auth (Google sign-in); Firestore; server-side API layer (Firebase Functions recommended); Firebase Hosting/Vercel for web; EAS Build for native later.
- Full decision record (selected options, why, alternatives, limitations): `ARCHITECTURE.md`.

### AI provider research (as of 2026-10-22, live access NOT verified)

- NVIDIA NIM: no card; ~1,000 credits signup; 40 RPM; 10K RPD; OpenAI-compatible at `integrate.api.nvidia.com/v1`; phone verification sometimes; production not covered by free key.
- GroqCloud: no card; 30 RPM; 14,400 RPD (small models); 1K RPD (larger); OpenAI-compatible at `api.groq.com/v1`; org-level rate limits.
- Mistral: no card (phone only); low RPM (~1–2); ~1B tokens/month (unpublished); OpenAI-compatible at `api.mistral.ai/v1`; free mode may train on data unless opted out.

### Retention policy

- Approved per owner direction: source discarded after generation; quiz history 30 days; share links 30 days revocable; 90-day inactive cleanup deferred pending definition/warnings/recovery safeguards.

### Brand proposal

- Added to `DESIGN_BRIEF.md` §9: minimal Notion-inspired identity, light/dark colour tokens, Inter typography, monospace for LaTeX, lowercase wordmark logo concept. Awaiting owner approval.

### Validation pending (commands not yet run)

- `npx create-expo-app` scaffold check; dependency install; Firebase project setup; provider sign-up + test calls (GroqCloud → NVIDIA NIM → Mistral); PDF/DOCX extraction test; LaTeX rendering test (KaTeX web / react-native-ratex native); Google sign-in web + native test.

### Known blockers

- Owner approval of `ARCHITECTURE.md` and `DESIGN_BRIEF.md` §9 required before Phase 2 scaffolding.
- AI provider free-tier access not verified against live accounts.
- Brand colours/typography/logo await owner approval.

## 2026-10-22 — Phase 2 design system specified

### Design decisions captured (Phase 2 interview)

- Navigation model: persistent tab bar (Generate, History, Share, Account).
- Quiz-taking layout: one question at a time, paginated.
- Responsive strategy: balanced — mobile and desktop equal priorities.
- Progress/timer prominence: subtle (step counter + compact timer).
- Theme toggle location: Settings only (account screen).
- Motion: meaningful — purposeful transitions for progress and answer feedback.

### Design system documented in `DESIGN_BRIEF.md`

- Design principles (content first, progressive disclosure, typographic hierarchy, generous whitespace, restrained colour, predictable interactions, accessibility by design, meaningful motion).
- Colour tokens: light and dark themes, semantic roles (background, surface, border, text-primary/secondary/tertiary, accent, success, danger, warning, focus).
- Typography: Inter (headings/body), JetBrains Mono (code/LaTeX), size and weight scale.
- Spacing scale: 4 px base, multiples of 4 px.
- Layout and breakpoints: mobile 0 / tablet 768 px / desktop 1024 px; max content width 720 px.
- Components: button (primary/secondary/danger/ghost), input, select/menu, dialog, notification/toast, progress indicator.
- Quiz components: question, MCQ option, theory answer, timer, results.
- State components: loading, error, empty.
- Screen specifications: sign-in, home generation, source upload/paste, generation progress/error, quiz-taking, completion/results, history, shared-quiz landing/attempt, account/settings.
- Accessibility and keyboard behaviour; theme behaviour (light/dark/system).

### Approval gate

- Design system is proposed, NOT approved for implementation. No UI code written.
- Owner feedback requested on colour palette, tab bar labels/order, quiz layout, theme toggle placement, and any missing screens.

## 2026-10-22 — Phase 2 design system approved with conditions; Generate-screen prototype in progress

### Owner approval (with conditions)

- Design system APPROVED for a Generate-screen prototype only — not all nine screens.
- Condition 1: Verify WCAG AA contrast in light and dark themes before finalising tokens.
- Condition 2: Keep tab order Generate, History, Share, Account.
- Condition 3: Keep one-question-at-a-time quiz navigation with Previous/Next + review step before submission.
- Condition 4: Theme controls in Account/Settings with Light, Dark, System options.
- Condition 5: Specifications cover quota exhaustion, generation failures, expired share links, deleted quizzes, empty states.

### Design system documented in `DESIGN_BRIEF.md`

- Design principles, anti-patterns, colour tokens (light/dark), typography (Inter + JetBrains Mono), spacing scale (4px base), layout/breakpoints (mobile/tablet/desktop), components (button/input/select/dialog/notification/progress), quiz components (question/MCQ option/theory answer/timer/results), state components (loading/error/empty), all 9 screen specs, accessibility, theme behaviour.

### Current work

- Generate-screen prototype being built with Expo + React Native Web + TypeScript.
- Prototype scope: centered single-column layout, document upload (PDF/DOCX/TXT), pasted-text input, quiz type (MCQ/Theory/Mixed), difficulty (Easy/Medium/Hard), question count (1-50), optional timer, generate button, quota indicator.
- Frontend-only prototype. No backend, Firebase, or AI provider functionality implemented or claimed.

### Validation pending

- WCAG AA contrast verification for light/dark tokens (owner condition 1).
- Owner review of Generate-screen prototype before expanding design system.

## 2026-10-22 — Generate-screen prototype complete

### What was built

- Expo + React Native Web + TypeScript project scaffolded
- Design tokens: light/dark colour palette, Inter typography, JetBrains Mono for LaTeX,
  spacing scale (4px base), breakpoints (mobile/tablet/desktop)
- Theme context: light/dark/system with localStorage persistence
- Components: Button (4 variants), Input, SegmentedControl, Toggle, TabBar
- Generate screen: centered single-column, document upload (PDF/DOCX/TXT), pasted-text
  input, quiz type (MCQ/Theory/Mixed), difficulty (Easy/Medium/Hard), question count
  (1-50), optional timer, generate button, quota indicator, loading/error/empty states
- Tab order: Generate, History, Share, Account
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Dev server running on port 8080 for review

### Important

- Frontend-only prototype. No backend, Firebase Auth, Firestore, or AI provider
  functionality implemented or claimed.
- Do not claim backend functionality is working unless implemented and tested.

### Established from the project brief

- Quizzle is an AI quiz-generation/study application.
- Web-first direction with a possible iOS/Android path.
- Google-only sign-in.
- Inputs: PDF, DOCX, TXT, or pasted text; one document per generation session.
- MCQ, theory, or mixed questions; difficulty, question count, and optional timer.
- Initial question-count ceiling: 50.
- Need source-wide coverage, math/physics notation, results, history, and shareable quiz URLs.
- Gemini billing/card verification is currently unsuitable; NVIDIA NIM, GroqCloud, and OpenRouter are candidates to evaluate.
- Owner wants the model to ask about visual direction and UI preferences instead of generating generic design.

### Files created

- `PROJECT_CONTEXT.md`
- `CHANGELOG.md`
- `NEXT_STEPS.md`
- `DESIGN_BRIEF.md`

### Verification status

- These documents describe requirements and proposed work.
- No source repository has been inspected in this session.
- No application code, automated tests, live AI API calls, authentication, deployment, or retention mechanism has been verified.

### Failed approaches

- None recorded yet.

### Known blockers

- Product/design discovery is incomplete.
- Architecture is not approved.
- AI provider access and quotas are not verified.
- No repository state has been supplied or inspected.

---

## 2026-10-22 — Phase 3: Application foundation

### Files created

**Tooling / configuration**

- `.eslintrc.js` — ESLint (typescript-eslint, react, react-native, react-hooks)
- `.prettierrc` — Prettier (single quotes, 100 col, 2-space)
- `jest.config.js` — Jest via `@react-native/jest-preset`
- `babel.config.js` — `babel-preset-expo`
- `tests/setup.js` — test globals
- `tests/__mocks__/fileMock.js` — asset stub
- `app.json` — added `expo-router` plugin
- `package.json` — added `lint`, `lint:fix`, `format`, `format:write`, `test`, `test:watch`, `typecheck`, `build:web` scripts

**Source**

- `types/index.ts` — shared domain types (Quiz, QuizAttempt, ShareLink, User, GenerationConfig)
- `services/firebase.ts` — Firebase init from env vars + `validateFirebaseConfig()`
- `services/auth.ts` — Google sign-in (web), `onAuthStateChanged`, `isAuthConfigured()`
- `services/storage.ts` — cross-platform AsyncStorage adapter (replaces web-only `localStorage`)
- `hooks/useResponsive.ts` — breakpoint helpers
- `hooks/useNetworkStatus.ts` — online/offline via `@react-native-community/netinfo`
- `components/Dialog.tsx` — modal
- `components/Notification.tsx` — toast
- `components/Progress.tsx` — step counter + progress bar
- `components/States.tsx` — `LoadingState`, `EmptyState`, `ErrorState`, `OfflineState`, `OfflineBanner`
- `screens/SignIn.tsx` — Google sign-in screen per DESIGN_BRIEF §12.1

**Tests**

- `components/__tests__/Button.test.tsx`, `Input.test.tsx`, `States.test.tsx`
- `screens/__tests__/Generate.test.tsx`
- `theme/__tests__/tokens.test.ts`, `ThemeContext.test.tsx`, `contrast.test.ts`
- `hooks/__tests__/useResponsive.test.ts`
- `services/__tests__/storage.test.ts`

### Files modified

- `App.tsx` — app shell with auth state; fixed a **Rules-of-Hooks violation** (`useState` after conditional returns)
- `theme/tokens.ts` — removed module-load `Dimensions.get()`; added `isDesktopWidth`/`isTabletWidth`; added `overlay`, `shadow`, `spinnerTrack`, `spinnerHead` tokens
- `theme/ThemeContext.tsx` — AsyncStorage persistence, OS appearance listener, `ready` flag
- `components/Button.tsx` — spinner colours from tokens
- `components/Toggle.tsx` — **fixed bug**: the `style` prop was accepted but never applied
- `components/Notification.tsx`, `Dialog.tsx`, `Progress.tsx`, `SignIn.tsx` — converted to `useWindowDimensions()` + theme-aware style factories
- `screens/Generate.tsx` — quota now data-driven (see below); offline banner; offline guard on generate

### What was fixed (not just added)

1. **Fabricated usage statistic removed.** `Generate.tsx` displayed a hardcoded `Daily generations: 12 / 50`. The quota indicator is now driven by a `quota` prop; when unknown it renders **nothing** rather than inventing numbers.
2. **Rules-of-Hooks violation** in `App.tsx` — hooks were declared after conditional returns.
3. **`localStorage` (web-only) replaced with AsyncStorage** — this would have crashed on native.
4. **`Toggle` ignored its `style` prop.**
5. **Dead code removed** — `DialogWithTheme`, `SignInScreenWithTheme`, unused `TabBar` import and `tabs` const in `App.tsx`.

### Checks — all passing

| Check     | Command                       | Result                   |
| --------- | ----------------------------- | ------------------------ |
| Typecheck | `npx tsc --noEmit`            | clean, 0 errors          |
| Lint      | `npx eslint . --ext .ts,.tsx` | **0 errors**, 8 warnings |
| Format    | `npx prettier --check .`      | clean                    |
| Tests     | `npx jest`                    | **74 passed**, 9 suites  |
| Web build | `npx expo start --web`        | bundles, 271 modules     |

Remaining 8 lint warnings are all `@typescript-eslint/no-explicit-any` in test harnesses and one `react-hooks/exhaustive-deps` in pre-existing code. None are errors.

### Bugs found and recorded (not fixed — need owner decision)

**WCAG AA contrast (owner approval condition 1) — 2 deviations found:**

Measured with `theme/__tests__/contrast.test.ts`:

```
light textPrimary/background     17.40:1  PASS
light textSecondary/background    5.74:1  PASS
light textTertiary/background     2.85:1  FAIL (exempt only if used solely for disabled controls)
light accent/background           5.00:1  PASS
light border/surface              1.18:1  FAIL (needs 3:1 per WCAG 1.4.11)
light success/successMuted        3.12:1  PASS
light danger/dangerMuted          4.41:1  PASS
light warning/warningMuted        3.07:1  PASS
dark  textPrimary/background     19.17:1  PASS
dark  textSecondary/background    7.48:1  PASS
dark  textTertiary/background     2.45:1  FAIL (same exemption caveat)
dark  accent/background           5.21:1  PASS
dark  border/surface              1.21:1  FAIL (needs 3:1 per WCAG 1.4.11)
dark  success/successMuted        4.32:1  PASS
dark  danger/dangerMuted          4.29:1  PASS
dark  warning/warningMuted        6.17:1  PASS
```

**Deviation 1 — `border` token (1.18:1 light / 1.21:1 dark).**
WCAG 1.4.11 requires 3:1 for visual boundaries that identify a UI component. This applies here because DESIGN_BRIEF §9.2 says input state is "communicated via border colour only", so the border is the sole affordance.
Compliant alternatives (computed, **not applied** — requires owner approval):

- light: `#8F8F8F` → 3.02:1 on surface, 3.23:1 on background
- dark: `#666666` → 3.03:1 on surface, 3.29:1 on background

**Deviation 2 — `textTertiary` token (2.85:1 light / 2.45:1 dark).**
WCAG 1.4.3 exempts _disabled_ controls, and the token is documented as "Disabled, muted text" — fine for that use. **However** DESIGN_BRIEF §9.2 also assigns it to input **placeholder** text, which is _not_ exempt. If placeholders must be readable, this token needs to reach 4.5:1 (e.g. `#767676` gives 4.54:1 on white).

Both deviations are pinned by tests at their current measured values, so the suite stays green while the shortfall stays auditable, and any palette change breaks the test.

### Failed approaches (recorded so they are not retried)

1. **`jest-expo/jest-config` does not exist** in jest-expo v58. Use `@react-native/jest-preset`.
2. **Overriding `testEnvironment: 'jsdom'`** in Jest broke React Native Testing Library with `__fbBatchedBridgeConfig is not set`. The preset's own environment and `setupFiles` must be preserved — extend, never replace.
3. **Mocking all of `react-native`** broke RNTL (it could not detect host components). The real fix was removing module-load `Dimensions.get('window')` from `theme/tokens.ts` and using `useWindowDimensions()` in components.
4. **`Dimensions.get('window')` at module scope** (in `tokens.ts`, `Dialog`, `Notification`, `SignIn`) touched the native bridge at import time and crashed Jest. Replaced with the `useWindowDimensions()` hook.
5. **`ajv` hoisting conflict** broke the dev server with `Cannot find module 'ajv/dist/compile/codegen'` after adding the `expo-router` plugin: eslint@8 pins ajv@6 while expo-router→schema-utils→ajv-keywords@5 needs ajv@8. Fixed by installing `ajv@^8` at the root so eslint nests its own ajv@6.
6. **`react-native/no-unused-styles`** is structurally incompatible with theme-aware `getStyles(colors)` factories and reports every style as unused. Disabled with an explanatory comment.
7. **`react-native/no-color-literals` accepts no options** in this version (`ignore` is rejected). Resolved by promoting `overlay`/`shadow`/`spinnerTrack`/`spinnerHead` into design tokens instead of using inline disables.

### What has NOT been verified

- **Visual rendering.** No browser is available in this sandbox. The web bundle compiles (271 modules) and the HTML returns 200, but **nothing has been visually confirmed** — layout, spacing, and theme appearance are unverified.
- **Native (iOS/Android).** Not built, not run, not tested. No claim of native support is made.
- **Firebase Auth.** No Firebase project exists. `isAuthConfigured()` returns false without env vars, and the app shows an honest "Sign-in is not configured" message. Google sign-in is **not** verified working.
- **Firestore**, server-side API layer, and AI provider integration are **not implemented** — deliberately out of scope for the foundation phase.

### Known bugs / limitations in current code

- `Generate.tsx` uses a web-only `<input type="file">` via a ref for file picking. This will **not work on native**; `expo-document-picker` is required there.
- Generate still shows an `Alert` explaining that backend generation is not implemented. This is intentional and honest — it is not a dead button.
- `screens/SignIn.tsx` "Privacy policy" and "Terms of service" are plain `<Text>`, not links, because no such documents exist yet. Making them look like links would be a decorative control implying nonexistent functionality.
- History / Share / Account tabs render an explicit "not implemented yet" placeholder rather than fake content.

---

## 2026-10-22 — Phase 3 follow-up: WCAG AA contrast resolved

Both deviations recorded in the Phase 3 entry are now **fixed**, not pinned.

### Approach

The root cause was that two tokens were each serving two different requirements,
so neither could satisfy WCAG without breaking the other. Each was **split**:

| Before         | After                                                          | Why                                                                                                                          |
| -------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `border`       | `border` (decorative) + `borderControl` (control boundaries)   | WCAG 1.4.11 requires 3:1 only for boundaries _necessary to identify a component_; dividers and card outlines do not qualify. |
| `textTertiary` | `textTertiary` (readable) + `textDisabled` (disabled controls) | WCAG 1.4.3 exempts _disabled_ controls but not placeholder text.                                                             |

### Token changes

| Token                                     | Light                 | Dark                  |
| ----------------------------------------- | --------------------- | --------------------- |
| `borderControl` (new)                     | `#8F8F8F`             | `#666666`             |
| `textTertiary` (changed)                  | `#999999` → `#707070` | `#525252` → `#8A8A8A` |
| `textDisabled` (new)                      | `#999999`             | `#525252`             |
| `border` (unchanged, now decorative only) | `#E5E5E5`             | `#2A2A2A`             |

### Components updated to use `borderControl`

- `components/Input.tsx` — input boundary
- `components/Button.tsx` — secondary button border
- `components/SegmentedControl.tsx` — unselected option border
- `components/Toggle.tsx` — track off-state
- `screens/Generate.tsx` — inactive source tabs, upload drop zone, question-count input, timer input

`components/Button.tsx` disabled text now uses `textDisabled` instead of `textTertiary`.

### Two additional bugs found and fixed

1. **The toggle track was effectively invisible when off.** It used `border`,
   giving 1.18:1 (light) / 1.21:1 (dark) against the surface — the control could
   not be seen at all. Now uses `borderControl` (3.02:1 / 3.03:1).
2. **Placeholder contrast was being measured against the wrong surface.** The
   common suggestion `#767676` reaches 4.54:1 on pure white but only **4.24:1** on
   the input fill `#F7F7F7`, so it would have failed. `textTertiary` was chosen
   against `surface` (the harder case): `#707070` gives 4.62:1 on surface and
   4.95:1 on background.

### Measurement notes

- Progress bars are assessed **fill-vs-track** (3.97:1 light / 3.90:1 dark), since
  that boundary carries the information. Track-vs-page is not the applicable test.
- Decorative `border` remains intentionally below 3:1; a test asserts this so the
  decorative/control distinction cannot silently collapse.
- A test asserts `textDisabled` stays a separate, lower-contrast token so faded
  disabled styling can never leak into content that must be readable.

### Files changed

- `theme/tokens.ts` — tokens split/raised, with a doc comment explaining the rules
- `theme/__tests__/contrast.test.ts` — rewritten; 36 assertions, all real
  compliance requirements, zero pins. Report now prints all measured pairs.
- `components/Input.tsx`, `Button.tsx`, `SegmentedControl.tsx`, `Toggle.tsx`
- `screens/Generate.tsx`
- `DESIGN_BRIEF.md` — §5 colour tables, §9.2 input spec, §16 rewritten as RESOLVED
- `app.json` — removed the `expo-router` plugin (see below)
- `NEXT_STEPS.md`, `PROJECT_CONTEXT.md`, `CHANGELOG.md`

### Navigation decision

**Kept the existing custom tab shell.** The `expo-router` plugin registration was
removed from `app.json` — it was dead config for file-based routing the app does
not use, and it caused the `ajv` dependency conflict noted in the Phase 3 entry.
The `expo-router` package stays installed but is intentionally unused. No
migration without a concrete requirement.

### Checks

| Check                         | Result                               |
| ----------------------------- | ------------------------------------ |
| `npx tsc --noEmit`            | 0 errors                             |
| `npx eslint . --ext .ts,.tsx` | 0 errors, 8 warnings                 |
| `npx prettier --check .`      | clean                                |
| `npx jest`                    | **89 passed** (up from 74), 9 suites |
| `npx expo start --web`        | bundles, 266 modules, HTTP 200       |

### Still outstanding

- **Visual review is the main remaining gap** — no browser in this sandbox, so the
  appearance of the new border colours (particularly the darker `#8F8F8F` control
  borders and the visible toggle track) is **unconfirmed**. The owner should review
  the live preview in both themes.
- AI-provider integration is explicitly deferred until accessibility and visual
  review are complete.

---

## 2026-10-22 — Firebase Auth: integration prepared (NOT verified)

**Google sign-in is implemented but has never run against a real Firebase
project. It must not be described as working.** The blocker is missing
credentials, which only the owner can supply.

### 1. Existing implementation identified

- `services/firebase.ts` — lazy `initializeApp` / `getAuth` / `getFirestore`,
  config read from `EXPO_PUBLIC_FIREBASE_*` env vars.
- `services/auth.ts` — Google sign-in (popup + redirect fallback),
  `onAuthStateChanged`, `signOut`, `getCurrentUser`.
- `screens/SignIn.tsx` — Google-only sign-in screen.
- `App.tsx` — auth state gate in the app shell.

Required env vars: `EXPO_PUBLIC_FIREBASE_API_KEY`,
`EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`,
`EXPO_PUBLIC_FIREBASE_APP_ID`.
Recommended: `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`.

### 2. Security fix — `.env` was NOT gitignored

`.gitignore` contained `.env*.local`, which only matches files **ending** in
`.local`. Plain `.env` and `.env.production` were **not** ignored and would have
been committed with real credentials.

Replaced with:

```
.env
.env.*
!.env.example
```

Verified: `.env`, `.env.local`, `.env.production` all ignored; `.env.example`
still tracked; no `.env` files tracked; no credential-shaped strings
(`AIza…`) in any tracked file.

### 3. Added `.env.example`

Placeholders only, with a header explaining that Firebase web config is public
by design and that access is enforced by Firestore rules + Authorized Domains.
Explicitly warns never to put AI provider or service-account keys there.

### 4. Actionable configuration check

`services/firebase.ts` now exposes `getFirebaseConfigStatus()` returning
structured problems classified as `missing` / `placeholder` / `invalid` /
`recommended-missing`. It detects:

- unset variables,
- values still copied from `.env.example` (`your-…`, all-zero IDs),
- malformed project IDs and auth domains.

`screens/SignIn.tsx` renders a **"Finish Firebase setup"** checklist naming each
offending variable. When misconfigured the sign-in button is **removed entirely**
rather than left as a control that cannot work.

`services/auth.ts` adds `describeAuthError()` mapping Firebase codes to
actionable messages, notably `auth/unauthorized-domain` (the most likely failure
on a preview host) and `auth/operation-not-allowed`.

### 5. Two auth bugs fixed

1. **Broken redirect flow.** `getRedirectResult()` was called immediately after
   `signInWithRedirect()`, but the page has already navigated away, so it always
   returned null. Redirect results are now consumed once on startup via
   `consumeRedirectResult()`.
2. **Redirect hijacked the page on user cancel.** The fallback triggered on
   `auth/popup-closed-by-user`, navigating away when the user simply closed the
   popup. It now only falls back on `auth/popup-blocked` (and the genuinely
   unsupported-environment codes). Cancellation is reported as "Sign-in was
   cancelled", not an error.

### 6. Documentation

`docs/FIREBASE_SETUP.md` — full Console walkthrough: project creation, web app
registration, enabling the Google provider, **Authorized Domains** (including the
Arena preview host), OAuth consent screen, native requirements (bundle ID,
SHA-1/256, `initializeAuth` + RN persistence — NOT implemented), a verification
checklist, and a troubleshooting table.

### 7. Files changed

- `.gitignore` — env-file fix (security)
- `.env.example` — new, placeholders only
- `services/firebase.ts` — structured config diagnostics
- `services/auth.ts` — redirect fix, cancel handling, `describeAuthError`
- `screens/SignIn.tsx` — setup checklist replaces dead button
- `App.tsx` — consumes redirect result, surfaces config status
- `jest.config.js` — transform `.mjs`; add firebase/@firebase to
  `transformIgnorePatterns` (the SDK ships ESM and broke Jest)
- `services/__tests__/firebase.test.ts`, `services/__tests__/auth.test.ts`,
  `screens/__tests__/SignIn.test.tsx` — new
- `docs/FIREBASE_SETUP.md` — new
- `NEXT_STEPS.md`, `CHANGELOG.md`

### 8. Checks

| Check                         | Result                             |
| ----------------------------- | ---------------------------------- |
| `npx tsc --noEmit`            | 0 errors                           |
| `npx eslint . --ext .ts,.tsx` | 0 errors, 7 warnings               |
| `npx prettier --check .`      | clean                              |
| `npx jest`                    | **118 passed** (was 89), 12 suites |
| `npx expo start --web`        | bundles, 271 modules, HTTP 200     |

New tests cover the config validator (missing / placeholder / malformed /
trimming), the error mapper, and both sign-in states. None contact Firebase.

### 9. Operational note

`node_modules` does not persist between sessions in this environment and had to
be reinstalled (`npm install --legacy-peer-deps`). `npx tsc` will try to fetch an
unrelated `tsc` package from npm if dependencies are missing — reinstall rather
than running it.

### 10. Deferred

AI-provider integration remains deferred per owner instruction, until
authentication works and the remaining backend prerequisites are addressed.
Firestore and the server-side API layer are still not implemented.
