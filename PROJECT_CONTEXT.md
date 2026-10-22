# Quizzle — Project Context

**Status:** Phase 1 — architecture proposed, awaiting owner approval. No implementation work is verified.  
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
| Brand colours / typography / logo | None yet — proposal in DESIGN_BRIEF.md §9, awaiting approval |

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

## 4. AI provider candidates (research gathered, live access NOT yet verified)

Evaluate in this order. All three permit free access without a credit card, but live registration, quotas, and model availability must be verified against actual accounts before selection. **Never enable paid usage without explicit owner approval.**

| Provider | Sign-up | Card required? | Published free limits | Endpoint (OpenAI-compatible) | Notes |
|---|---|---|---|---|---|
| NVIDIA NIM | build.nvidia.com (Developer Program) | No | ~1,000 credits signup; 40 RPM; 10K RPD | `integrate.api.nvidia.com/v1` | Phone verification sometimes; production not covered by free key; per-model deprecation dates posted |
| GroqCloud | console.groq.com (email) | No | 30 RPM; 14,400 RPD (small models); 1K RPD (larger) | `api.groq.com/v1` | Rate limits at org level; adding card (zero spend) raises limits 10x |
| Mistral | console.mistral.ai | No (phone only) | Low RPM (~1–2); ~1B tokens/month (unpublished) | `api.mistral.ai/v1` | Free mode may train on data unless opted out; must activate Studio billing section |

Keep provider-specific logic replaceable behind an `AIProvider` interface so the AI provider can be swapped without rewriting the app.

## 5. Architecture — APPROVED (provisionally, Phase 1), design system APPROVED with conditions (Phase 2)

**Selected stack:**
- Expo + React Native + React Native Web + TypeScript
- Expo Router for navigation
- Firebase Authentication with Google sign-in
- Firestore for quiz definitions, attempts, ownership, sharing, and metadata
- Server-side API layer (Firebase Functions recommended; Railway/Render alternative) for AI calls and privileged operations
- Firebase Hosting or Vercel for web deployment
- EAS Build for native builds (later)

**Design system:** Approved with conditions (see `DESIGN_BRIEF.md` §15). Prototype the Generate screen first; do not implement all nine screens until the owner reviews the prototype.

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
- Prevent document instructions from overriding system-level quiz-generation requirements (system prompt separate from user content; delimiter markers).

## 7. Retention policy — APPROVED (per owner direction)

- Uploaded source material: temporary processing; discard after generation by default.
- Saved quiz history: 30 days.
- Share links: 30 days, revocable earlier.
- Inactive-user cleanup: NOT implemented for initial release. Deletion after 90 days of inactivity is deferred until the inactivity definition, user warning process, and recovery safeguards are documented and approved.

Clarify what happens to attempts and shares when a quiz or account is deleted.

## 8. Design approach

Do not generate a generic AI-looking interface by default. Confirmed direction: minimal, Notion-referencing, centered single-column home screen, both light and dark themes, balanced web/mobile.

Brand proposal (colours, typography, logo concept) is in `DESIGN_BRIEF.md` §9 and awaits owner approval before implementation.

Do not finalise the design system or build all screens until the owner approves the design direction and architecture. See `DESIGN_BRIEF.md`.

## 9. Engineering principles

- Implement in small, reviewable phases.
- Inspect the existing repository before replacing files or scaffolding.
- Separate UI, business logic, data access, and provider-specific AI code.
- Do not claim tests, API access, deployment, or native support without verification.
- Record actual commands and outcomes.
- Keep documentation updated so another model can continue without the original conversation.

## 10. Current state

Repository inspected and reset on `arena/9131a5e6-quizzle`. Starter-template Vite/React/Gemini app removed. Four planning documents plus `ARCHITECTURE.md` present. Phase 0 discovery complete. Phase 1 architecture documented and provisionally approved.

## 11. Key open decisions

- Final owner approval of `ARCHITECTURE.md` (stack, data model, security, provider order, deployment).
- AI provider selection after live free-tier verification (NVIDIA NIM / GroqCloud / Mistral).
- File size, text length, generation frequency, and storage quotas (not yet finalised).
- Theory-question grading approach: AI-assisted grading against a transparent rubric, with review/self-assessment option (approved in principle; details in Phase 3).
- OCR for scanned PDFs: out of scope for initial release; detect and report limitation.
- Brand colours, typography, and logo: proposal in DESIGN_BRIEF.md §9, awaiting approval.
