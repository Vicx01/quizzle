# Quizzle — Project Context

**Status:** Phase 0 discovery complete. No implementation work is verified.  
**Last updated:** 2026-10-22  
**Branch:** `arena/9131a5e6-quizzle`

## 1. Product overview

Quizzle is an AI-powered study application that turns learning material into quizzes. The initial target is a web application, with a maintainable path to iOS and Android.

## 2. Confirmed product decisions (from Phase 0 discovery)

These were answered by the owner and are treated as confirmed, not assumed:

| Decision | Confirmed value |
|---|---|
| Intended users | University / college students |
| Main study use cases | Coursework, exam prep, lecture review |
| Visual references | Notion |
| Visual direction | Minimal |
| Home-screen layout | Centered single-column focused on quiz generation |
| Theme | Both light and dark (user-toggleable) |
| Platform priority | Balanced — web and mobile equally |
| Existing Quizzle assets to preserve | None — start completely fresh |
| Brand colours / typography / logo | None yet — guidance needed |

## 3. Established product requirements (unchanged)

- Google-only sign-in.
- Home screen focused on quiz generation.
- Accept one source document per generation session, or pasted text.
- Supported input formats: PDF, DOCX, TXT, and pasted text.
- Configurable question count, initially no more than 50.
- Question formats: multiple choice (MCQ), theory, or mixed.
- Difficulty selection.
- Optional quiz timer.
- Generate questions from across the source, not only its opening sections.
- Support mathematical/scientific notation, including LaTeX rendering.
- Show completion state, final score, correct answers, and explanations.
- Save completed quizzes to history.
- Shareable URLs that let another person take the same saved quiz definition.
- Free-tier quotas and sensible abuse protection.
- Explicit retention and deletion behaviour.
- Do not depend on Gemini API billing/card verification being available.

Question quality, answer correctness, and source coverage take priority over generating the maximum number of questions.

## 4. AI provider candidates (UNVERIFIED)

Evaluate in this order, without assuming current access or limits:

1. NVIDIA NIM.
2. GroqCloud.
3. mistral as an optional fallback.

Verify account requirements, whether payment-card verification is required, available models, current free quotas, context/output limits, structured-output support, privacy terms, and availability in the owner's region. Do not silently switch to a paid provider or paid usage. Never enable paid usage without explicit owner approval.

Keep provider-specific logic replaceable behind an interface so the AI provider can be swapped without rewriting the app.

## 5. Proposed architecture — NOT YET APPROVED

Evaluate rather than blindly adopt:

- Expo + React Native + React Native Web + TypeScript.
- Expo Router for navigation.
- Firebase Authentication with Google sign-in.
- Firestore for quiz definitions, attempts, ownership, sharing, and metadata.
- A server-side API layer for AI calls and privileged operations.
- Web deployment on an appropriate hosting provider, with a path to native builds.

The owner's "balanced" platform priority (web and mobile equally) is compatible with Expo + React Native Web, but the following must still be checked before committing:
- Document upload/extraction (PDF, DOCX, TXT) on web and native.
- LaTeX/mathematical notation rendering compatibility.
- Firebase Auth Google sign-in on web and native.
- Firestore offline behaviour and sharing links.
- Server-side API layer hosting and deployment target.

## 6. Security and privacy requirements

- Keep AI provider keys server-side; never bundle them into client code.
- Enforce authentication, ownership, quotas, and permissions server-side.
- Validate file types, sizes, extracted-text lengths, and generated output.
- Treat uploaded documents and model responses as untrusted input.
- Do not render arbitrary HTML or execute generated code.
- Do not expose private source material through share links by default.
- Avoid retaining full source documents unless an approved feature requires it.
- Implement actual deletion and expiry mechanisms; do not merely hide expired records.
- Do not log sensitive source content unnecessarily.

## 7. Proposed retention defaults — NEED OWNER APPROVAL

- Uploaded source material: temporary processing; discard after generation by default.
- Saved quiz history: 30 days.
- Share links: 30 days, revocable earlier.
- Inactive-user cleanup: consider deletion after 90 days of inactivity, subject to owner approval and applicable requirements.

Clarify what happens to attempts and shares when a quiz or account is deleted.

## 8. Design approach

Do not generate a generic AI-looking interface by default. Confirmed direction: minimal, Notion-referencing, centered single-column home screen, both light and dark themes, balanced web/mobile.

Do not finalise the design system or build all screens until the owner approves the design direction and architecture. See `DESIGN_BRIEF.md`.

## 9. Engineering principles

- Implement in small, reviewable phases.
- Inspect the existing repository before replacing files or scaffolding.
- Separate UI, business logic, data access, and provider-specific AI code.
- Do not claim tests, API access, deployment, or native support without verification.
- Record actual commands and outcomes.
- Keep documentation updated so another model can continue without the original conversation.

## 10. Current state

Repository inspected and reset on `arena/9131a5e6-quizzle`. Starter-template Vite/React/Gemini app removed. Four planning documents present. Phase 0 discovery complete.

## 11. Key open decisions

- Final architecture and hosting choice (Expo + Firebase proposal not yet approved).
- AI provider and verified free access (NIM / GroqCloud / mistral not yet verified).
- File size, text length, generation frequency, and storage quotas.
- Final retention policy (owner approval needed).
- Theory-question grading approach.
- Whether OCR for scanned PDFs is in scope.
- Brand colours, typography, and logo (guidance requested by owner).
