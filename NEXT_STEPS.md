# Quizzle — Next Steps

**Current phase:** Phase 3 — application foundation (COMPLETE, accessibility fixes applied)

**Status:** Foundation built and all checks green. **WCAG AA contrast RESOLVED.** **Firebase credentials supplied and config verified locally; the Google sign-in flow is still UNVERIFIED and needs a browser test.** AI/backend deliberately NOT implemented.

**Last updated:** 2026-10-22

**Branch:** `arena/9131a5e6-quizzle`

---

## Current status — Firebase configured, sign-in UNVERIFIED

Credentials are now supplied in `.env` (gitignored, never committed). The config
check passes: `getFirebaseConfigStatus()` returns `ok: true` with no errors and
no warnings, and Expo inlines all values into the bundle.

**The Google sign-in flow has still not been executed.** It must be verified in a
browser (see below). Do not describe authentication as working until step 5
succeeds.

### Add this domain to Firebase — likely the remaining blocker

Firebase → **Authentication → Settings → Authorized domains → Add domain**:

```
8080-ihvd80mwkmpx5vxcn6r60.e2b.app
```

This is the current Arena preview host. **The sandbox ID changes between
sessions**, so if sign-in later fails with `auth/unauthorized-domain`, re-read the
origin from the error message the app prints and add that instead. Keep
`localhost` in the list for local runs.

### How to verify (requires your browser)

1. Open the preview and confirm you see **"Sign in to Quizzle"** with a working
   **Sign in with Google** button — _not_ the "Finish Firebase setup" checklist.
2. Click it. Expect: Google account chooser → consent → back on the Generate screen.
3. Reload — you should stay signed in.
4. Firebase Console → Authentication → Users should show a new user.
5. Report back, and the result will be recorded in `CHANGELOG.md`.

If the popup hangs or is blocked, **open the preview URL in a normal browser tab**
rather than the embedded iframe — embedded previews often block popups and
third-party cookies, which breaks the Firebase popup flow.

### Why it could not be verified here

The sandbox cannot reach Firebase at all (outbound network is restricted to
github/npm/pypi; `identitytoolkit.googleapis.com` and the auth domain both fail
to connect). Config wiring was verified by running the real
`getFirebaseConfigStatus()` against the supplied values, but the OAuth handshake
can only be completed from a browser.

### Console steps that were also required

1. Authentication → Sign-in method → **Google → Enable**
2. Authorized domains (above)
3. Google Cloud → OAuth consent screen → add test users if External/Testing

Full walkthrough: `docs/FIREBASE_SETUP.md`.

### Security

- `.env` is gitignored; only `.env.example` is tracked. Verified: no `.env` in
  `git status`, no credential-shaped strings in tracked files.
- Firebase web config is public by design; access is enforced by Firestore
  security rules (**not yet written**) and the Authorized Domains allowlist.
- These credentials were shared in conversation. They grant no data access by
  themselves, but you can rotate the API key in Google Cloud Console if you want
  them out of the chat history.

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
