# Quizzle — Next Steps

**Current phase:** Phase 3 — application foundation (COMPLETE, verified)

**Status:** Foundation built and all checks green. Two WCAG contrast deviations found and recorded, awaiting owner decision. Firebase/AI/backend deliberately NOT implemented.

**Last updated:** 2026-10-22

**Branch:** `arena/9131a5e6-quizzle`

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

| Check      | Command                       | Result                |
| ---------- | ----------------------------- | --------------------- |
| Typecheck  | `npx tsc --noEmit`            | 0 errors              |
| Lint       | `npx eslint . --ext .ts,.tsx` | 0 errors, 8 warnings  |
| Format     | `npx prettier --check .`      | clean                 |
| Tests      | `npx jest`                    | 74 passed / 9 suites  |
| Web bundle | `npx expo start --web`        | 271 modules, HTTP 200 |

### Bugs fixed during this phase

1. Removed a **fabricated usage statistic** (`Daily generations: 12 / 50`) — quota is now data-driven and renders nothing when unknown.
2. Fixed a **Rules-of-Hooks violation** in `App.tsx`.
3. Replaced web-only **`localStorage` with AsyncStorage** (would have crashed on native).
4. Fixed **`Toggle` ignoring its `style` prop**.
5. Removed dead code (`DialogWithTheme`, `SignInScreenWithTheme`, unused imports).

### Failed approaches — do not retry

- `jest-expo/jest-config` does not exist in v58 → use `@react-native/jest-preset`.
- Do **not** override Jest `testEnvironment` with `jsdom` → `__fbBatchedBridgeConfig is not set`.
- Do **not** mock all of `react-native` → RNTL cannot detect host components.
- Do **not** call `Dimensions.get('window')` at module scope → crashes Jest.
- `react-native/no-unused-styles` is incompatible with `getStyles(colors)` factories → disabled.
- `react-native/no-color-literals` accepts no options in this version.

---

## Decisions needed from the owner (blocking)

### 1. WCAG AA contrast — 2 deviations (approval condition 1)

Full measurements are in `CHANGELOG.md` and `theme/__tests__/contrast.test.ts`.

**a) `border` token fails WCAG 1.4.11** (light 1.18:1, dark 1.21:1; needs 3:1).
Applies because DESIGN_BRIEF §9.2 says input state is "communicated via border colour only".
Options:

- Keep `#E5E5E5` / `#2A2A2A` (current, non-compliant, preserves the airy look)
- Change to `#8F8F8F` / `#666666` (compliant, visibly heavier borders)

**b) `textTertiary` fails 4.5:1** (light 2.85:1, dark 2.45:1).
Exempt **only** for disabled controls. DESIGN_BRIEF §9.2 also uses it for **placeholder** text, which is not exempt.
Options:

- Restrict `textTertiary` to disabled controls only, and give placeholders a compliant colour
- Raise `textTertiary` to ~`#767676`

### 2. Firebase project

No Firebase project exists, so Google sign-in is unverified. Provide a project + the `EXPO_PUBLIC_FIREBASE_*` values to verify sign-in on web.

### 3. Navigation: keep custom shell or migrate to Expo Router?

`expo-router` is installed and registered in `app.json`, but the app currently uses a custom tab shell. Migrating is a separate change and should be approved before being undertaken.

---

## Not verified (explicitly)

- **Visual rendering** — no browser in this sandbox; bundle compiles but appearance is unconfirmed.
- **Native iOS/Android** — never built or run. No native support is claimed.
- **Firebase Auth / Firestore** — not configured; no live sign-in test.
- **AI provider access** — no keys, no live calls.

---

## Phase 4 acceptance criteria (next phase)

**Depends on the owner decisions above.**

1. Owner decision recorded on the two WCAG contrast deviations; tokens updated accordingly.
2. Firebase project created; `EXPO_PUBLIC_FIREBASE_*` configured.
3. Google sign-in **verified working on web** (popup + redirect).
4. Firestore created with security rules deployed (ownership enforced server-side).
5. Server-side API layer scaffolded with the replaceable `AIProvider` interface (ARCHITECTURE.md §3.6).
6. **AI provider free-tier verified with a live account** before any provider-specific code — order: GroqCloud → NVIDIA NIM → Mistral. No paid usage without explicit approval.
7. `expo-document-picker` integrated to replace the web-only `<input type="file">` in `Generate.tsx`.
8. Backend quota endpoint wired to the `quota` prop so the indicator shows real data.
9. PDF/DOCX/TXT extraction validated server-side; scanned-PDF detection confirmed.
10. LaTeX rendering validated (KaTeX web; native renderer evaluated).
11. CI (GitHub Actions) running lint + typecheck + tests on push.
12. Native build attempted (EAS), with results recorded honestly — including failures.

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
