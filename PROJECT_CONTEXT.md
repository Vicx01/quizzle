# Quizzle — Project Context

**Status:** Planning / discovery. No implementation work is verified by this document.
**Last updated:** 2026-10-22

## 1. Product overview

Quizzle is an AI-powered study application that turns learning material into quizzes. The initial target is a web application, with a maintainable path to iOS and Android.

## 2. Established product requirements

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

## 3. AI provider candidates

Evaluate in this order, without assuming current access or limits:
1. NVIDIA NIM.
2. GroqCloud.
3. OpenRouter as an optional fallback.

Verify account requirements, whether payment-card verification is required, available models, current free quotas, context/output limits, structured-output support, privacy terms, and availability in the owner's region. Do not silently switch to a paid provider or paid usage.

## 4. Proposed architecture — NOT YET APPROVED

Evaluate rather than blindly adopt:
- Expo + React Native + React Native Web + TypeScript.
- Expo Router.
- Firebase Authentication with Google sign-in.
- Firestore for quiz definitions, attempts, ownership, sharing, and metadata.
- A server-side API layer for AI calls and privileged operations.
- Web deployment on an appropriate hosting provider, with a path to native builds.

Check compatibility for document upload/extraction, PDF handling, mathematical notation, navigation, and native platforms before committing.

## 5. Security and privacy requirements

- Keep AI provider keys server-side; never bundle them into client code.
- Enforce authentication, ownership, quotas, and permissions server-side.
- Validate file types, sizes, extracted-text lengths, and generated output.
- Treat uploaded documents and model responses as untrusted input.
- Do not render arbitrary HTML or execute generated code.
- Do not expose private source material through share links by default.
- Avoid retaining full source documents unless an approved feature requires it.
- Implement actual deletion and expiry mechanisms; do not merely hide expired records.
- Do not log sensitive source content unnecessarily.

## 6. Proposed retention defaults — NEED OWNER APPROVAL

- Uploaded source material: temporary processing; discard after generation by default.
- Saved quiz history: 30 days.
- Share links: 30 days, revocable earlier.
- Inactive-user cleanup: consider deletion after 90 days of inactivity, subject to owner approval and applicable requirements.

These are proposals, not implemented policies. Clarify what happens to attempts and shares when a quiz or account is deleted.

## 7. Design approach

Do not generate a generic AI-looking interface by default. Interview the owner about:
- Intended users and use cases.
- Visual references and products they like.
- Visual direction, typography, colours, branding, and existing assets.
- Home-screen layout and quiz-taking experience.
- Light/dark mode.
- Desktop/mobile priorities.
- Navigation and accessibility.

Do not finalise the design system or build all screens until the owner approves the design direction. See `DESIGN_BRIEF.md`.

## 8. Engineering principles

- Implement in small, reviewable phases.
- Inspect the existing repository before replacing files or scaffolding.
- Separate UI, business logic, data access, and provider-specific AI code.
- Do not claim tests, API access, deployment, or native support without verification.
- Record actual commands and outcomes.
- Keep documentation updated so another model can continue without the original conversation.

## 9. Current state

Discovery and planning only. The repository has not been inspected in this handoff, and no implementation, test, provider access, or deployment is verified.

## 10. Key open decisions

- User segments and primary study use cases.
- Visual direction and design references.
- Whether an existing codebase is available and what should be reused.
- Final architecture and hosting choice.
- AI provider and verified free access.
- File size, text length, generation frequency, and storage quotas.
- Final retention policy.
- Theory-question grading approach.
- Whether OCR for scanned PDFs is in scope.
