# Quizzle — Next Steps

**Current phase:** Phase 2 — design system and UX (prototype complete)  
**Status:** Design system APPROVED with conditions; Generate-screen prototype COMPLETE — ready for owner review  
**Last updated:** 2026-10-22  
**Branch:** `arena/9131a5e6-quizzle`

## What was done in Phase 0

Discovery interview completed. Confirmed: university students as users, Notion as visual reference, minimal visual direction, centered single-column home screen, light + dark themes, balanced web/mobile priority, no existing assets to preserve.

## What was done in Phase 1

Architecture documented in `ARCHITECTURE.md` (provisionally approved): Expo + React Native Web + TypeScript, Expo Router, Firebase Auth (Google), Firestore, server-side API layer, replaceable AI provider (GroqCloud → NVIDIA NIM → Mistral). AI provider free tiers researched (none require a card; live verification pending).

## What was done in Phase 2

1. Ran design interview; confirmed navigation (tab bar), quiz layout (one question at a time), breakpoints (balanced), progress/timer (subtle), theme toggle (settings only), motion (meaningful).
2. Defined design system in `DESIGN_BRIEF.md`: principles, colour tokens (light/dark), typography, spacing, layout/breakpoints, components, quiz components, state components, all 9 screen specs, accessibility, theme behaviour.
3. **Design system APPROVED with owner conditions** (see `DESIGN_BRIEF.md` §15): verify WCAG AA contrast before finalising tokens; tab order Generate/History/Share/Account; one-question-at-a-time with Previous/Next + review step; theme in Settings (Light/Dark/System); cover quota exhaustion, generation failures, expired share links, deleted quizzes, empty states.
4. Generate-screen prototype in progress (see below).

## Current work: Generate-screen prototype

**Goal:** Functional prototype of the Generate screen using the design tokens, shown at mobile and desktop widths in both light and dark themes.

**Scope (this screen only — not all nine screens):**
- Centered single-column layout
- Document upload (PDF, DOCX, TXT) + pasted-text input
- Quiz type: MCQ / Theory / Mixed
- Difficulty: Easy / Medium / Hard
- Question count: 1–50
- Optional timer: toggle + minutes input
- Generate button (disabled until valid input)
- Quota indicator (subtle)
- Empty/loading/error states specified but not all implemented in prototype

**Tech stack:** Expo + React Native Web + TypeScript (per approved architecture).

**Not yet implemented (by design):**
- All other 8 screens
- Firebase Auth / Firestore backend
- AI provider integration (no backend claims made)
- Backend functionality of any kind (prototype is frontend-only)

## Acceptance criteria for Phase 2 (prototype)

- [x] Design principles defined.
- [x] Colour tokens (light + dark) defined.
- [x] Typography scale and font choices defined.
- [x] Spacing scale defined.
- [x] Layout and responsive breakpoints defined.
- [x] Components specified (button, input, select, dialog, notification, progress).
- [x] Quiz components specified.
- [x] State components specified.
- [x] All 9 screens specified.
- [x] Accessibility and keyboard behaviour defined.
- [x] Light/dark theme behaviour defined.
- [x] Owner approval of design direction (obtained with conditions).
- [x] Generate-screen prototype implemented with design tokens.
- [x] Prototype shown at mobile + desktop widths in light + dark themes.
- [ ] WCAG AA contrast verification (condition 1) — pending.

## Remaining approvals before Phase 3 implementation

1. **Generate-screen prototype review** — Owner reviews the prototype before design system is expanded across the application.
2. **WCAG AA contrast verification** — Verify light/dark token contrast (owner condition 1).
3. **Architecture approval** — Owner confirms `ARCHITECTURE.md` (still provisionally approved from Phase 1).
4. **Provider selection after live verification** — Verify free-tier access for GroqCloud → NVIDIA NIM → Mistral before selecting. Do not incur paid usage without explicit approval.

## Phase 3 acceptance criteria (next phase, not yet started)

- [ ] Expo + React Native Web + TypeScript project scaffolded.
- [ ] Design system implemented as reusable tokens + components.
- [ ] Firebase Auth Google sign-in working on web.
- [ ] Firestore with security rules deployed.
- [ ] Server-side API layer with replaceable `AIProvider` interface.
- [ ] AI provider free-tier verified and connected behind the interface.
- [ ] Home quiz-generation screen implemented per spec.
- [ ] Quiz-taking screen (one question at a time) implemented per spec.
- [ ] Quiz completion/results screen implemented per spec.
- [ ] Lint, type-check, and tests passing in CI.
- [ ] Deployable web build.

## Suggested next prompt

Review the Generate-screen prototype (mobile + desktop, light + dark). Approve or request changes. Verify WCAG AA contrast of tokens. Once approved, begin Phase 3: scaffold the full Expo project, implement the design system tokens/components, set up Firebase Auth + Firestore, and verify AI provider free-tier access before writing provider-specific code.

## Outstanding items to update after approval

- `DESIGN_BRIEF.md`: record prototype feedback and WCAG contrast results.
- `ARCHITECTURE.md`: mark architecture as approved or revise decisions.
- `PROJECT_CONTEXT.md`: update section 5 (architecture status) and section 11 (open decisions).
- `CHANGELOG.md`: append dated entries for prototype review and Phase 3 work.
- `NEXT_STEPS.md`: advance to Phase 3 acceptance criteria as work completes.
