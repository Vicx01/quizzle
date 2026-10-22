# Quizzle — Next Steps

**Current phase:** Phase 3 — application foundation (COMPLETE, accessibility fixes applied)

**Status:** Foundation built and all checks green. **WCAG AA contrast RESOLVED.** **Firebase integration is prepared but UNVERIFIED — the current blocker is missing credentials.** Google sign-in has never been executed against a real Firebase project. AI/backend deliberately NOT implemented.

**Last updated:** 2026-10-22

**Branch:** `arena/9131a5e6-quizzle`

---

## Current blocker — Firebase credentials (ACTION REQUIRED)

The app cannot get past the sign-in screen because Firebase is not configured.
Everything needed is in place **except the four values below**.

### Supply these in `.env`

```
cp .env.example .env
```

| Variable                           | Source                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_FIREBASE_API_KEY`     | Firebase Console → Project settings → General → Your apps → SDK setup and configuration |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | same block (`<project-id>.firebaseapp.com`)                                             |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID`  | same block                                                                              |
| `EXPO_PUBLIC_FIREBASE_APP_ID`      | same block                                                                              |

Then **restart the dev server** — `EXPO_PUBLIC_*` is inlined at build time.

### Also required in the Firebase Console

1. **Authentication → Sign-in method → Google → Enable.**
2. **Authentication → Settings → Authorized domains** — add the origin you are
   browsing from. The Arena preview host (e.g. `8080-<sandbox-id>.e2b.app`)
   **must** be added or sign-in fails with `auth/unauthorized-domain`.
3. **OAuth consent screen** (Google Cloud) — if External/Testing, add test users.

Full walkthrough: `docs/FIREBASE_SETUP.md`.

### What the app does now when config is missing

Instead of a sign-in button that silently fails, it shows **"Finish Firebase
setup"** listing exactly which variables are missing or still placeholders, and
what to do. Verified by tests (`screens/__tests__/SignIn.test.tsx`).

### Security

- The four values are Firebase _web_ config — public by design, not secrets.
  Access is enforced by Firestore security rules (not yet written) and the
  Authorized Domains allowlist.
- `.env` and all `.env.*` variants are gitignored; only `.env.example` is
  tracked. **The previous `.env*.local` pattern did not ignore plain `.env` —
  this was fixed.**
- Verified: no credential-shaped strings in tracked files; no `.env` tracked.

### Sign-in is NOT verified

Do not describe authentication as working. It has never run against a real
project. Verification steps are in `docs/FIREBASE_SETUP.md` §5.

---

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
- **Firebase Auth / Firestore** — not configured; no live sign-in test.
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
- **Firebase Auth / Firestore** — not configured; no live sign-in test.
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

- Firebase Auth live test (needs project + env vars)
- Firestore rules deployment (`firebase deploy --only firestore:rules`)
- AI provider live calls (needs keys)
- `eas build` for native (needs EAS account)
- Visual/browser verification (needs a browser)
- PDF/DOCX extraction tests (needs server-side layer)
- LaTeX rendering tests (needs renderer integration)
