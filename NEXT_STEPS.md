# Quizzle — Next Steps

**Current phase:** Phase 1 — architecture and plan  
**Status:** Architecture documented (provisionally approved); awaiting owner sign-off before Phase 2 scaffolding  
**Last updated:** 2026-10-22  
**Branch:** `arena/9131a5e6-quizzle`

## What was done in Phase 0

1. Inspected the existing repository: a single-commit Vite + React 19 + Gemini AI Studio starter template. Emptied it and added the four planning documents.
2. Ran the discovery interview; confirmed users (university students), visual direction (minimal, Notion-referencing), layout (centered single-column), theme (light + dark), platform priority (balanced), and no existing assets to preserve.
3. Recorded all confirmed decisions in `PROJECT_CONTEXT.md` and `DESIGN_BRIEF.md`.

## What was done in Phase 1 (documentation only — no code scaffolded)

1. Finalised a maintainable web-first architecture with a native path (see `ARCHITECTURE.md`).
2. Defined system boundaries: client (Expo + RNW), API layer, Firebase Auth, Firestore, AI provider, file processing, deployment.
3. Defined the data model: `users`, `quizzes`, `quizAttempts`, `shareLinks`, `rateLimits` collections with Firestore security rules.
4. Defined the security approach: server-side AI keys, ownership via Firebase Auth UID, upload validation, rate limiting, prompt-injection prevention, share-link expiration/revocation, hard deletion.
5. Defined the AI provider abstraction (`AIProvider` interface) and researched free tiers for NVIDIA NIM, GroqCloud, and Mistral (none require a credit card; live verification pending).
6. Documented shared vs platform-specific logic (file picker, LaTeX rendering, Google sign-in are platform-specific; business logic and UI components are shared).
7. Defined deployment plan: Firebase Hosting + Firebase Functions (recommended), EAS Build for native later, GitHub Actions CI/CD.
8. Identified compatibility risks: RN Web library compatibility, `expo-file-system` on web, `react-native-ratex` RN version requirement, scanned PDFs, serverless timeouts.
9. Defined MVP scope (MCQ generation, quiz taking, results, history, sharing, LaTeX, light/dark) and out-of-scope items (theory grading v1, OCR, native builds v1, payments).
10. Defined an ordered implementation roadmap (Phases 1–4).
11. Updated `DESIGN_BRIEF.md` §9 with a brand proposal (colours, typography, logo concept) awaiting approval.

## Acceptance criteria for Phase 1 (all documented)

- [x] Maintainable web-first architecture finalised with native path.
- [x] Shared vs platform-specific logic defined.
- [x] Frontend, backend/API, auth, database, AI integration, file processing, deployment boundaries defined.
- [x] Compatibility risks, dependency constraints, and blockers identified.
- [x] MVP scope and ordered roadmap defined.
- [x] Four project docs updated; `ARCHITECTURE.md` created.
- [x] No full application implementation started (by design).

## Remaining approvals before Phase 2

1. **Architecture approval** — Owner confirms `ARCHITECTURE.md` (stack, data model, security, provider order, deployment). Any changes recorded in `CHANGELOG.md` and reflected in `PROJECT_CONTEXT.md`.
2. **Brand approval** — Owner reviews `DESIGN_BRIEF.md` §9 (colours, typography, logo) and approves or requests changes.
3. **Provider selection after live verification** — Verify free-tier access for GroqCloud → NVIDIA NIM → Mistral before selecting. Do not incur paid usage without explicit approval.

## Phase 2 acceptance criteria (next phase, not yet started)

- [ ] Expo + React Native Web + TypeScript project scaffolded.
- [ ] Firebase Auth Google sign-in working on web.
- [ ] Firestore with security rules deployed.
- [ ] Server-side API layer with replaceable `AIProvider` interface.
- [ ] AI provider free-tier verified and connected behind the interface.
- [ ] Quiz generation (MCQ, up to 50 questions) end-to-end.
- [ ] Quiz-taking flow with results display.
- [ ] Lint, type-check, and tests passing in CI.
- [ ] Deployable web build.

## Suggested next prompt

Review `ARCHITECTURE.md` and approve (or request changes to) the stack, data model, security approach, provider order, and deployment plan. Review `DESIGN_BRIEF.md` §9 and approve (or request changes to) the brand proposal. Once approved, begin Phase 2: scaffold the Expo project, set up Firebase Auth + Firestore, and verify free-tier access for the AI provider before writing provider-specific code.

## Outstanding items to update after approval

- `ARCHITECTURE.md`: mark architecture as approved or revise decisions.
- `PROJECT_CONTEXT.md`: update section 5 (architecture status) and section 11 (open decisions).
- `DESIGN_BRIEF.md`: record brand feedback and design-system decisions.
- `CHANGELOG.md`: append dated entries for approvals and Phase 2 work.
- `NEXT_STEPS.md`: advance to Phase 2 acceptance criteria as work completes.
