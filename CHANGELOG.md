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
