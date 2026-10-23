# Quizzle — Project Context

**Status:** Database layer migrated to Supabase PostgreSQL (deployed and verified). **Supabase Auth is the sole authentication provider — Firebase Auth has been removed.** **Owner quiz persistence is implemented (Phase 5).** **Secure sharing + server-side grading is implemented as two Edge Functions (Phase 6), tested but NOT deployed and never invoked.** Backend/AI not implemented — quiz _generation_ is still unconnected. Awaiting accessibility/visual review before AI-provider integration.
**Last updated:** 2026-10-23
**Branch:** `arena/9131a5e6-quizzle`

## 1. Product overview

Quizzle is an AI-powered study application that turns learning material into quizzes. The initial target is a web application, with a maintainable path to iOS and Android.

## 2. Confirmed product decisions (from Phase 0 discovery)

These were answered by the owner and are treated as confirmed, not assumed:

| Decision                            | Confirmed value                                              |
| ----------------------------------- | ------------------------------------------------------------ |
| Intended users                      | University / college students                                |
| Main study use cases                | Coursework, exam prep, lecture review                        |
| Visual references                   | Notion                                                       |
| Visual direction                    | Minimal                                                      |
| Home-screen layout                  | Centered single-column focused on quiz generation            |
| Theme                               | Both light and dark (user-toggleable)                        |
| Platform priority                   | Balanced — web and mobile equally                            |
| Existing Quizzle assets to preserve | None — start completely fresh                                |
| Brand colours / typography / logo   | None yet — proposal in DESIGN_BRIEF.md §9, awaiting approval |

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

| Provider   | Sign-up                              | Card required?  | Published free limits                              | Endpoint (OpenAI-compatible)  | Notes                                                                                                |
| ---------- | ------------------------------------ | --------------- | -------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| NVIDIA NIM | build.nvidia.com (Developer Program) | No              | ~1,000 credits signup; 40 RPM; 10K RPD             | `integrate.api.nvidia.com/v1` | Phone verification sometimes; production not covered by free key; per-model deprecation dates posted |
| GroqCloud  | console.groq.com (email)             | No              | 30 RPM; 14,400 RPD (small models); 1K RPD (larger) | `api.groq.com/v1`             | Rate limits at org level; adding card (zero spend) raises limits 10x                                 |
| Mistral    | console.mistral.ai                   | No (phone only) | Low RPM (~1–2); ~1B tokens/month (unpublished)     | `api.mistral.ai/v1`           | Free mode may train on data unless opted out; must activate Studio billing section                   |

Keep provider-specific logic replaceable behind an `AIProvider` interface so the AI provider can be swapped without rewriting the app.

## 5. Architecture — APPROVED (provisionally, Phase 1), design system APPROVED with conditions (Phase 2), foundation implemented (Phase 3)

**Phase 3 note:** the frontend stack, design system, navigation shell and sign-in
screen are implemented. Firestore, the server-side API layer, and the AI provider
are **not** implemented — see §10.

**Selected stack:**

- Expo + React Native + React Native Web + TypeScript
- Expo Router for navigation
- **Supabase Authentication with Google sign-in** (Firebase Auth removed 2026-10-23)
- **Supabase PostgreSQL** for quiz definitions, attempts, ownership, sharing, and metadata (Firestore superseded)
- Server-side API layer (Supabase Edge Functions recommended) for AI calls and privileged operations
- Vercel or Supabase Hosting for web deployment
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
- Saved quiz history: 30 days. **REFINED 2026-10-23 — see below.**
- Share links: 30 days, revocable earlier.

**2026-10-23 refinement (owner direction, Supabase Phase 1).** The "saved quiz
history: 30 days" line above is superseded for automatic behaviour:

- **Quiz history, attempts and answers are user-owned records. They are never
  deleted automatically.** Only the user can delete them.
- **30-day cleanup applies only to eligible temporary records** — currently
  share links. This is encoded in `public.retention_purge_candidates`, which
  lists `share_links` and nothing else.
- The document-processing rules below are unchanged and remain approved.

The distinction exists so that no scheduled job can ever destroy a user's own
quiz history by accident.

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

**Phase 3 (application foundation) is complete and verified.**

- Project structure, TypeScript strict mode, ESLint, Prettier and Jest are configured.
- Design tokens and reusable components are implemented (light + dark).
- Sign-in screen and app shell with tab navigation are implemented.
- **Supabase Auth is the sole authentication provider.** Firebase Auth and
  `services/firebase.ts` have been deleted; the `EXPO_PUBLIC_AUTH_PROVIDER`
  switch is gone. The client bundle contains **zero** Firebase references.
- **Account screen** shows the signed-in identity (name, email, profile photo)
  and is the only place Sign out is offered; sign-out is wired to Supabase.
- Loading / empty / error / offline states are implemented.
- Checks: typecheck clean, lint 0 errors, format clean, **149 tests passing**.
- Web bundle compiles (271 modules, HTTP 200).

**Deliberately NOT implemented:** server-side API layer and AI provider
integration. No generation functionality is claimed. The database schema, its
Row Level Security policies, and owner quiz persistence **are** implemented and
covered by **96 executed** database tests plus 173 app tests; no user data has
been written to the hosted project.

**Owner condition 1 (WCAG AA contrast) has been verified and RESOLVED.** Two
deviations were found in the approved palette and fixed by splitting the
overloaded tokens:

- `border` → `border` (decorative) + `borderControl` (`#8F8F8F` light /
  `#666666` dark) for boundaries that identify a control, >= 3:1.
- `textTertiary` → raised to `#707070` / `#8A8A8A` (>= 4.5:1) and split from the
  new `textDisabled` (`#999999` / `#525252`) for disabled controls, which are
  exempt from WCAG 1.4.3.

Full measurement tables are in `DESIGN_BRIEF.md` §16. All 36 contrast assertions
in `theme/__tests__/contrast.test.ts` now pass as real requirements — the
deviations are not pinned.

**Not verified:** visual rendering (no browser in the sandbox), native iOS/Android
(no build or run), AI provider access (no keys).

Supabase Row Level Security **is** implemented, deployed and verified: 74
executed database tests plus a live audit on the hosted project. Firestore is a
superseded artefact: `firestore.rules` (v3) is written and statically reviewed
but has **never been executed** — the emulator cannot run in this sandbox and
neither Java-free alternative implements security rules. 45 rules tests are
written and **unrun**.**No application code uses Firestore.**

**Shared quizzes are server-mediated, not a direct read.** `firestore.rules` v3
gives no client read access to a quiz it does not own, because the quiz document
embeds `questions[].correctAnswer` and rules cannot redact fields. Share links
grant no direct access; a server endpoint resolves the token and returns an
allowlisted subset. That endpoint is specified in `docs/SHARE_LINK_API.md` and
**not implemented**, so sharing does not function yet.

### Supabase database foundation — implemented (2026-10-23)

The Firebase-to-Supabase migration has begun with **Phase 1: database
foundation**. This is schema-only and is fully separated from the running app.

- Nine tables in `public`: `profiles`, `quizzes`, `questions`,
  `question_answer_keys`, `share_links`, `quiz_attempts`, `attempt_answers`,
  `usage_counters`, `generation_log`.
- RLS is enabled on all nine. `usage_counters` and `generation_log` have **no**
  client policies at all and are reachable only by trusted server code.
- Correct answers live in `question_answer_keys`, a physically separate table
  from `questions`. Taking a quiz never grants access to the answer key.
- Share tokens are stored only as SHA-256 hashes.
- `quiz_attempts.user_id` is nullable, so anonymous share attempts are
  supported; abuse prevention is server-side.
- **74 database tests execute on every run** (`npm run test:db`) against real
  PostgreSQL via PGlite — no Docker, no local Supabase stack, no credentials.
  The suite is mutation-checked: deliberately breaking any of six controls
  makes it fail.

**Deployed to the hosted Supabase project** `quizzle`
(`ppswtryoescehrytxvsh`, eu-west-1, PostgreSQL 17.11). All five migrations are
applied, RLS is verified on all nine tables, and live security behaviour was
tested on the hosted database inside rolled-back transactions. A follow-up
count confirmed zero rows and zero users remained. The hosted results match the
local suite, including a `42501` rejection of a client attempt to insert its
own quiz score, and the profile-bootstrap trigger firing against the real
GoTrue schema.

**No application code was changed by the database phase, and Firebase
authentication is untouched and still working.** Local migration files were
renamed to the versions Supabase assigned, so `supabase db push` treats them as
already applied.

### Supabase authentication — sole provider (2026-10-23)

**Supabase Auth is the only authentication path in the code.** The migration
switch has been removed: there is no configuration in which Firebase Auth runs.

- `services/auth.ts` is Supabase-only — no dispatcher, no provider branching.
- `services/authSupabase.ts` holds the OAuth mechanics.
- `services/firebase.ts` and its test suite are **deleted**.
- Screens consume the `AppUser` model (`id`, `email`, `displayName`,
  `photoURL`), so no screen depends on a vendor user type.
- Google remains the **only** sign-in method: email and phone providers are
  disabled on the hosted project.

**Verification status — read carefully.** Google OAuth is correctly configured
on the hosted project (`external_google_enabled: true`, client ID and secret
set, nonce check on, email and phone disabled). Every automated check passes.
But **no real Google sign-in has ever been executed**: this sandbox has no
network path to Google or to the Supabase host, so the interactive OAuth flow
cannot run here. A successful bundle build and passing unit tests are _not_
evidence that the live flow works. That confirmation requires the owner to sign
in from a real browser.

**One security action remains open:** the Google OAuth client secret cannot be
shown to have been rotated after an earlier exposure. See `NEXT_STEPS.md`.

See `docs/SUPABASE_MIGRATION.md` (plan) and `docs/SUPABASE_SETUP.md`
(project setup) for detail.

See `NEXT_STEPS.md` for the Phase 4 acceptance criteria and the blocking decisions.

## 11. Key open decisions

- ~~**WCAG AA contrast deviations**~~ — RESOLVED (2026-10-22); see DESIGN_BRIEF.md §16.
- **Visual review of the new border colours** — the darker control borders (`#8F8F8F` / `#666666`) and the now-visible toggle track have not been seen in a browser. Owner review in both themes is the main remaining gap.
- **Retire the Firestore rules suite?** `firestore.rules` and its 45 unrun tests
  predate the Supabase migration and no application code uses Firestore. The
  `firebase` package remains installed _only_ because that suite imports
  `firebase/firestore`. Owner decision.
- **Rotate the Google OAuth client secret** — an earlier value was exposed;
  rotation could not be verified through the API. Owner action.
- **Navigation** — the custom tab shell is kept. `expo-router` stays installed but unused; do not migrate without a concrete requirement.
- Final owner approval of `ARCHITECTURE.md` (stack, data model, security, provider order, deployment).
- ~~**Persistent document storage**~~ — RESOLVED (2026-10-23): not needed. Documents are processed in memory and discarded; no Storage bucket is created.
- ~~**Docker / local Supabase stack**~~ — RESOLVED (2026-10-23): not required. Database tests run on PGlite inside Node.
- ~~**Clean migration vs dual-run**~~ — RESOLVED (2026-10-23): clean swap; there is no production data to migrate.
- ~~**Create the Supabase project**~~ — RESOLVED (2026-10-23): project `quizzle` exists and the migrations are applied.
- ~~**Apply the migrations to a real Supabase project**~~ — RESOLVED (2026-10-23): applied and verified on the hosted database.
- **Create the Google OAuth client** (Google Cloud Console) and enable the Google provider in Supabase. This is the only blocker for the auth phase.
- **Schedule the 30-day share-link sweep.** Eligibility is encoded in the database; the job that performs the delete is not built.
- AI provider selection after live free-tier verification (NVIDIA NIM / GroqCloud / Mistral).
- File size, text length, generation frequency, and storage quotas (not yet finalised).
- Theory-question grading approach: AI-assisted grading against a transparent rubric, with review/self-assessment option (approved in principle; details in a later phase).
- OCR for scanned PDFs: out of scope for initial release; detect and report limitation.
- Brand colours, typography, and logo: implemented from DESIGN_BRIEF.md §9; contrast deviations pending resolution.
