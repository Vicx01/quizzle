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

---

## 2026-10-22 — Firebase credentials supplied; config verified, sign-in still UNVERIFIED

The owner supplied the real Firebase web config for their Quizzle project. The
values live in `.env` (gitignored) and are deliberately **not recorded here**.

### What was done

- Wrote the supplied values to `.env` (gitignored — **not committed, not staged**).
  All seven values incl. `measurementId`, which the app does not use (no Analytics
  SDK is imported).
- Confirmed `.env` is gitignored and absent from `git status`.
- Restarted the dev server. Expo reported:
  `env: load .env` and exported all seven `EXPO_PUBLIC_FIREBASE_*` variables.
- Verified the values are **inlined into the served bundle**: project id, API key,
  auth domain and app id all present in `index.bundle`.
- Verified the config check passes using the **real production code**: ran
  `getFirebaseConfigStatus()` with the supplied values against
  `services/firebase.ts` → `{ ok: true, errors: [], warnings: [] }`.
  (A temporary test was used for this and then deleted.)

Consequence: the app now renders the real **"Sign in with Google"** button instead
of the "Finish Firebase setup" checklist.

### What was NOT verified — sign-in

**The Google sign-in flow has not been executed.** Two reasons:

1. **The sandbox cannot reach Firebase at all.** Outbound network is restricted to
   github/npm/pypi. `identitytoolkit.googleapis.com` and
   the project's auth domain both fail to connect (HTTP 000). A live OAuth
   handshake is impossible from here.
2. Sign-in is interactive — it needs a real Google account in a browser.

Only the owner's browser can complete it. Do not describe authentication as
working until that test succeeds.

### Action required from the owner

**Add the preview host to Firebase Authorized Domains** (most likely remaining
blocker):

```
8080-ihvd80mwkmpx5vxcn6r60.e2b.app
```

Firebase Console → Authentication → Settings → Authorized domains → Add domain.
The sandbox ID changes between sessions, so if sign-in later fails with
`auth/unauthorized-domain`, add the origin printed in the app's error message.

Also confirm: Google provider enabled; OAuth consent screen test users added if
External/Testing.

If the popup hangs or is blocked, open the preview URL in a **normal browser
tab** — embedded iframe previews commonly block popups and third-party cookies,
which breaks the Firebase popup flow.

### Security note

These credentials were shared in conversation. Firebase **web** config is public
by design (it ships in every Firebase web app's client bundle) and grants no data
access on its own — access is governed by Firestore security rules (still not
written) and the Authorized Domains allowlist. If you would rather they were not
in chat history, rotate the API key in Google Cloud Console → Credentials.

**No credentials were committed.** `.env` is gitignored and only `.env.example`
(placeholders) is tracked.

### Checks

tsc 0 errors · eslint 0 errors / 7 warnings · prettier clean · jest 118 passed /
12 suites · expo web bundle 271 modules, HTTP 200.

### Still outstanding

- Browser verification of Google sign-in (owner)
- Firestore security rules — **none exist yet**, so there is no data-access
  control until these are written
- Server-side API layer, AI provider integration (deferred per owner instruction)

---

## 2026-10-22 — Sign-in diagnostics for embedded previews (Google 403)

The owner hit a Google **403** ("That's an error. We're sorry, but you do not
have access to this page") after tapping sign-in, and could not diagnose it
because **the app runs in a sandbox iframe preview with no visible address bar**.

A 403 from Google means the wiring works — Firebase accepted the API key and
project and the flow launched; Google then refused the consent page. The likely
causes are the framed preview, or an incomplete OAuth consent screen.

### Added

- `isEmbeddedInFrame()` — detects `window.self !== window.top`, treating a
  cross-origin parent read failure as "framed".
- `getCurrentOrigin()` — public accessor for the browser origin.
- `describeAuthErrorWithCode()` — appends the raw Firebase code to the message.
  Existing `describeAuthError` mapping is unchanged, so current tests hold.
- `SignInDiagnostics` on the sign-in screen (testID `signin-diagnostics`):
  - warns **"Open in a new browser tab to sign in"** when framed, explaining that
    Google blocks its consent pages from being framed and popups are blocked in
    frames;
  - prints the current origin under "This app origin", so it can be copied into
    Firebase Authorized Domains **without reading the address bar**;
  - notes the 403 causes (consent screen incomplete / not a test user).
- Docs: `docs/FIREBASE_SETUP.md` gains a "Google returns 403" section with the
  four causes in priority order, plus a troubleshooting-table row.

### Tests

13 new tests (128 total, up from 118): origin shown/omitted, framing warning
shown/hidden, diagnostics hidden when Firebase is misconfigured,
`describeAuthErrorWithCode` with and without a code, and the environment
helpers. One test initially assumed `window.location` existed in the jest
environment; it does not, so it now covers both the null-guard and the browser
path via `Object.defineProperty`.

### Still UNVERIFIED

Sign-in has still never completed. Root cause of the 403 not yet confirmed — it
needs one attempt from a **normal browser tab**.

**Next action for the owner:** open `https://8080-ihvd80mwkmpx5vxcn6r60.e2b.app`
in a real browser tab and try sign-in there.

### Checks

tsc 0 errors · eslint 0 errors / 7 warnings · prettier clean · 128 tests / 12
suites · bundle contains the new diagnostics and `window.self !== window.top`.

---

## 2026-10-23 — Google sign-in VERIFIED

**The owner ran the flow and confirmed a successful Google sign-in.** This was
the last open blocker from Phase 3, and the first time authentication has ever
been exercised against the live Firebase project.

Every previous entry described sign-in as prepared-but-unverified. That is no
longer accurate, so the stale claims were corrected in:

- `services/auth.ts` — the header `STATUS:` comment (said "never been executed
  against a real Firebase project")
- `docs/FIREBASE_SETUP.md` — document status and the implementation table
- `README.md` — the project status note
- `NEXT_STEPS.md` — status line, the old "sign-in UNVERIFIED / current blocker"
  section (rewritten as "VERIFIED"), both "not verified" lists, and the
  outstanding-commands list

### Gaps found while reviewing the now-working flow

These were not visible until sign-in actually worked:

1. **`signOut()` is exported from `services/auth.ts` but called nowhere.** A
   user can sign in and can never sign out. The Account tab is still a
   placeholder.
2. **Firestore is initialised (`getFirebaseFirestore()`) but never used** — no
   data layer exists.
3. **No Firestore security rules exist**, so there is no data-access control.
   This must be written before any user data is stored.
4. **Native iOS/Android auth has never been built.**

### Verification details NOT yet recorded

The owner confirmed success but these specifics were not captured:

- popup flow, or did it fall back to redirect?
- did the session survive a page reload?
- which origin was used — `localhost` or the `8080-….e2b.app` preview host?
- does the user appear in Firebase Console → Authentication → Users?

---

## 2026-10-23 — Account screen + working sign-out, and `.env.example` removed

Two changes, committed separately.

### 1. Environment file: `.env` is now the single manual file

Owner no longer wants a committed template.

- **Removed `.env.example`** from the repository (`git rm`).
- **`.gitignore`** — dropped the `!.env.example` negation, so every `.env`
  variant is ignored with no exceptions.
- Verified: `.env` is ignored (`git check-ignore -v .env` → rule at
  `.gitignore:43`), untracked (`git ls-files | grep -i '^\.env'` → empty), and
  **no credentials were staged or committed** (staged diff scanned for the API
  key, project id, sender id and app id). The local `.env` file was not deleted.
- `EXPO_PUBLIC_FIREBASE_*` names and the config/placeholder-detection logic are
  unchanged.
- Docs updated to drop `.env.example` and explain creating `.env` by hand, with
  per-shell commands (`touch` / `type nul >` / `New-Item`).
- `screens/SignIn.tsx` no longer tells the user to copy a file that no longer
  exists.
- Also corrected a stale line in `docs/FIREBASE_SETUP.md` §5 that still said
  sign-in must be described as unverified.
- CHANGELOG history left intact — those entries record what actually happened.

### 2. Account screen and working sign-out

`screens/Account.tsx` (new):

- Shows display name, email and profile photo.
- Falls back to an **initials avatar** when there is no photo
  (`getInitials()`), and to **"Signed in"** when there is no display name —
  Google accounts do not always expose either.
- **Sign out** button (secondary, full-width, disabled while in flight).

`App.tsx`:

- Tracks `currentUser`, `signingOut`, `signOutError`.
- `handleSignOut()` calls the existing `signOut()` from `services/auth`.
- **Does not flip auth state itself** — Firebase's `onAuthStateChanged` is the
  single source of truth. Setting it locally would race the listener and could
  show the sign-in screen before the session is torn down.
- On failure the user **stays signed in** and the error is shown. Silently
  swallowing it would strand them in an account they cannot leave; optimistically
  flipping to sign-in would claim a state that did not happen.
- Resets to the Generate tab, so a later sign-in does not resume on Account.

Protected screens: `authState === 'signed-out'` renders `SignInScreen`
regardless of `activeTab`, so Generate/History/Share/Account are unreachable
after sign-out.

### Tests — 21 new (128 → 149)

`screens/__tests__/Account.test.tsx` (15): name/email rendering, photo vs
initials fallback, missing display name, missing email, sign-out press, disabled
while in flight, error shown/not shown, null-user loading state, and 4
`getInitials` cases.

`tests/App.test.tsx` (6, new file): sign-in screen with no user, Generate screen
when signed in, identity on Account, **return to sign-in after sign-out with
protected screens gone**, stays signed in and surfaces the error when sign-out
fails, and tab reset on re-sign-in.

`services/auth` and `services/firebase` are mocked, so the shell test drives
`onAuthStateChanged` directly without contacting Firebase.

### Checks

typecheck clean · eslint **0 errors / 7 warnings** (all 7 pre-existing, in
`Generate.tsx`, `Generate.test.tsx`, `ThemeContext.test.tsx` — none in the new
files) · prettier clean · **149 tests / 14 suites** (was 128 / 12).

### Not started

Firestore security rules — held as a **separate, reviewable step** per the
owner's instruction. No user data is stored and no rules are deployed.
AI-provider integration still not started.

---

## 2026-10-23 — Firestore security rules PREPARED (not deployed, not verified)

Held as a separate, reviewable step at the owner's request. **No rules were
deployed and no user data was written.**

### `firestore.rules` (new)

Covers all five collections in ARCHITECTURE.md §3.9:

| Collection     | Client access                                                  |
| -------------- | -------------------------------------------------------------- |
| `users/{uid}`  | read/write own doc only; email immutable; client delete denied |
| `quizzes`      | owner-only, plus public read while a live share link exists    |
| `quizAttempts` | own attempts, or attempts on a quiz you own                    |
| `shareLinks`   | read by anyone; **no client writes** (server-only)             |
| `rateLimits`   | **no client access at all**                                    |

Key decisions:

- **Deny by default** — a `match /{document=**}` catch-all denies anything not
  explicitly allowed, including collections added later.
- **Ownership from `request.auth.uid` only.** A client-supplied `ownerId` cannot
  grant access: create requires `ownerId == uid`, and `ownerId` is immutable so
  a quiz cannot be transferred by an update.
- **Email is immutable** on the user doc, so a user cannot swap in another
  identity's address.
- **Public sharing** is resolved by looking up `shareLinks/{shareToken}` from the
  quiz's own `shareToken` field, checking revoked/expired. Rules cannot read a
  token supplied by the client, so this is the only workable shape.
- Client delete on `users` is denied (deletion must fan out to quizzes,
  attempts and share links, so it belongs server-side).

### `tests/rules/firestore.rules.test.ts` (new)

24 emulator tests using `@firebase/rules-unit-testing` (added as a devDependency,
v5.0.2), covering cross-user isolation, ownership forgery, ownership transfer,
over-long titles, share-link active/revoked/expired, `isPublic: false` with a
live token, server-only collections, and the default deny.

**These tests have NOT been run.** They require the Firestore emulator.

### Why they could not be verified here

No Java, no `firebase-tools`, and no network access to download the emulator
(`storage.googleapis.com` unreachable). So the rules are **syntactically
unchecked** and the tests are **unexecuted**. Verifying is the owner's next
action:

```bash
firebase emulators:start --only firestore --project quizzle-rules-test
npm run test:rules
```

The rules tests are excluded from `npm test` via `testPathIgnorePatterns`, with
a separate `jest.rules.config.js` and a `test:rules` script, so a missing
emulator cannot fail the app suite. Confirmed with `--listTests`: 14 files in
the default run, 1 in the rules run.

`firebase.json` (new) points Firestore at `firestore.rules` and pins the
emulator to **port 8089** to avoid colliding with the Expo web dev server on 8080.

### Checks (app suite)

typecheck clean · eslint **0 errors / 7 warnings** (all pre-existing) · prettier
clean · **149 tests / 14 suites** (unchanged — rules tests excluded by design).

### Still outstanding

- **Review and verify the rules, then deploy** (`firebase deploy --only
firestore:rules`).
- Firestore is still unused by the app — no data layer, nothing stored.
- AI-provider integration not started.

---

## 2026-10-23 — Firestore rules: static review + two defects fixed. STILL NOT EXECUTED.

**Bottom line: the rules have still never been executed.** Everything below is
static review plus type-checking. The 41 tests are written but **0 have run**.
They are not counted as passing.

### Why the emulator cannot run here (verified, not assumed)

Each avenue was actually attempted:

| Step                    | Result                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Java runtime            | **Obtained.** No system Java, but `jdk4py` ships a JDK in a PyPI wheel. OpenJDK 25.0.2 (Temurin) runs.                                                                            |
| Firebase CLI            | **Installed** from npm (`firebase-tools`).                                                                                                                                        |
| Emulator JAR            | **FAILED.** `firebase setup:emulators:firestore` → "Failed to make request to https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.22.0.jar" |
| Both official JAR hosts | `storage.googleapis.com` and `dl.google.com` both return `000` (blocked). npm, PyPI and GitHub return 200.                                                                        |

Two Java-free Firestore emulators were evaluated as substitutes and **both
rejected**:

- `@firestore-emulator/server` — a Node.js reimplementation. Zero mentions of
  security rules in its README; the only repo code matches for "rules" are lint
  config files. It does not evaluate rules, so tests against it would be
  meaningless.
- `hidane` — explicitly documents Security Rules as "does not yet" work.

Neither can validate rules, so neither was used. Rule evaluation is exactly the
behaviour under test, and an unofficial CEL evaluator could pass locally while
behaving differently in production.

### Defects found by static review — FIXED (v2)

1. **Malformed cross-document paths.** A generic `doc(path)` helper
   interpolated paths that already began with `/`, producing
   `/databases/x/documents//quizzes/id`. This affected every cross-document
   lookup: `isQuizOwner`, `shareLinkIsActive`, and the `quizAttempts` create
   check. Replaced with per-collection helpers using explicit path literals,
   with a comment warning against reintroducing the generic form.
2. **Query-scaling defect in `quizzes`.** read/update/delete used a
   cross-document lookup to test ownership even though `ownerId` is already on
   the document. That is 2 document accesses per document evaluated, which
   exhausts the per-request access limit and breaks list queries. These rules
   now read `resource.data.ownerId` directly (0 accesses). The cross-document
   lookup is retained only in `quizAttempts`, where the owner genuinely lives on
   another document.

### KNOWN ISSUE — public sharing exposes the answer key (OWNER DECISION)

`isSharedQuiz()` allows an **unauthenticated** read of the entire quiz document.
Per ARCHITECTURE.md §3.9 that document embeds `questions[].correctAnswer` and
`questions[].explanation`. Anyone with a live share link can read the answer key
before attempting the quiz, which defeats the point of a quiz.

To be precise about the risk: the `get()` lookup is **not** the leak —
`shareLinks` is already world-readable, so the lookup discloses nothing new. The
leak is that the answer key shares a document with publicly readable questions.

Two fixes, both documented in `firestore.rules`. Option (b) is the safer default
and matches deny-by-default:

- (a) move answers to a `quizzes/{id}/answers` subcollection, owner-only read;
- (b) remove `isSharedQuiz()` and serve shared quizzes through the server API,
  which returns a sanitised quiz.

Mitigating factor today: a quiz only becomes public once the **server** creates
a matching `shareLinks` document, and clients cannot write `shareLinks` at all —
so a client cannot make its own quiz public. There is a test for this.

### Tests: 41 written, 0 executed

Grew from 24 to 41. New negative coverage: anonymous create/update/delete on
quizzes, missing `ownerId`, `deletedAt` set at birth, non-string email, missing
`createdAt`, 200-char title boundary, attempt reassignment, owner editing an
attempt they did not author, anonymous attempts, `shareLinks` update/delete,
`rateLimits` update/delete, and a client forging a share link to self-publish.

The file **type-checks cleanly** (`tsc --ignoreConfig`, 0 errors). That validates
the TypeScript only — it says nothing about Firestore rules DSL syntax, which
remains unverified.

### To run (Windows PowerShell)

```powershell
java -version                                    # need 17+
winget install EclipseAdoptium.Temurin.21.JDK    # if missing, then restart shell
npm install -g firebase-tools
firebase login
firebase emulators:start --only firestore --project quizzle-rules-test   # terminal 1
npm run test:rules                                                        # terminal 2
```

`firebase.json` pins the emulator to port 8089 so it does not collide with the
Expo dev server on 8080.

### Checks

tsc clean · eslint 0 errors / 7 warnings (all pre-existing) · prettier clean ·
**app suite 149 tests / 14 suites** (unchanged; rules tests stay excluded).

Nothing was deployed, no billing enabled, no data written.
