# Quizzle — Architecture Document

**Status:** Phase 1 — proposed, awaiting owner approval  
**Last updated:** 2026-10-22  
**Branch:** `arena/9131a5e6-quizzle`  
**Related:** `PROJECT_CONTEXT.md`, `DESIGN_BRIEF.md`, `NEXT_STEPS.md`, `CHANGELOG.md`

---

## 1. Overview and goals

Quizzle is an AI-powered study application that turns learning material (pasted text or one uploaded PDF/DOCX/TXT document) into quizzes (MCQ, theory, or mixed). The initial target is a web application with a maintainable path to iOS and Android.

**Primary goals:**

- Web-first, with a shared codebase that can later compile to native iOS/Android.
- Smallest reliable architecture — no unnecessary microservices or paid infrastructure.
- AI provider keys never exposed to the client; all AI calls routed through a server-side API layer.
- Provider-specific AI logic replaceable behind an interface.
- Google-only authentication; ownership, quotas, and permissions enforced server-side.
- LaTeX rendering for mathematics and physics notation.
- Shareable quiz URLs with expiration and revocation.
- Explicit data retention and deletion.

---

## 2. System boundaries

```
+----------------+      HTTPS        +----------------------+      HTTPS        +---------------------+
|   Client App   | <==============> |  API Layer (Server)  | <==============> |   AI Provider       |
|  (Expo + RNW)  |                  |  (Node/Express or    |                  |  (NIM / Groq /      |
|  Web + Native  |                  |   Firebase Functions)|                  |   Mistral)          |
+----------------+                  +----------------------+                  +---------------------+
        |                                      |
        | Firebase SDK                         | Firestore SDK (server)
        v                                      v
+----------------+                  +----------------------+
| Firebase Auth  |                  |   Firestore (DB)     |
|  (Google SSO)  |                  |  (quiz data, users,  |
+----------------+                  |   attempts, shares)  |
                                    +----------------------+
```

### Boundary responsibilities

| Boundary                             | Responsibility                                                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Client (Expo + React Native Web)** | UI, navigation, input forms, quiz-taking, LaTeX rendering (web), theme toggle, file picking via DocumentPicker                                                                                     |
| **API Layer**                        | AI orchestration (prompt construction, provider calls, response parsing), file extraction (PDF/DOCX/TXT), quota enforcement, rate limiting, share-link generation/revocation, deletion/expiry jobs |
| **Firebase Auth**                    | Google sign-in, session management, user identity                                                                                                                                                  |
| **Firestore**                        | Users, quizzes, attempts, share links, rate-limit counters; security rules enforce ownership                                                                                                       |
| **AI Provider**                      | Text generation (structured JSON output for quizzes), theory-answer grading                                                                                                                        |

---

## 3. Architecture decisions

Each decision below records: selected option, why, important alternatives, and known limitations.

### 3.1 Frontend framework

**Selected:** Expo + React Native + React Native Web + TypeScript  
**Why:** Single codebase targets web and (later) iOS/Android, matching the owner's "balanced web/mobile" priority. Expo Router provides file-based navigation that works on both web and native. TypeScript gives type safety across the shared codebase.  
**Alternatives considered:**

- Vite + React 19 (the previous starter template): web-only, no native path without a rewrite.
- Next.js: web-only, no native path.
- Flutter / Swift + Kotlin: separate codebases, violates the shared-codebase goal.
  **Known limitations:**
- Not every web library works on React Native Web (DOM-dependent libraries fail).
- `expo-file-system` is not available on web; file upload must use platform-specific pickers.
- Native PDF/DOCX extraction libraries often require bare React Native (not Expo Go); server-side extraction is the safer cross-platform choice.
- Expo SDK upgrades require care; pin versions.

### 3.2 Navigation

**Selected:** Expo Router  
**Why:** File-based routing, developed by the Expo team, works on web and native with the same route structure. Supports dynamic routes (e.g., `/quiz/[id]`, `/share/[token]`) needed for shareable quiz URLs.  
**Alternatives:** React Navigation (more configuration, not file-based), React Router (web only).  
**Known limitations:** Deep linking and native sharing need extra configuration; web and native URL handling can differ slightly.

### 3.3 Authentication

**Selected:** Firebase Authentication with Google sign-in  
**Why:** Google-only sign-in is a hard requirement. Firebase Auth provides managed Google OAuth on both web (Firebase SDK popup/redirect) and native (Expo AuthSession + Firebase). No custom auth server to build or secure. Integrates directly with Firestore security rules via `request.auth.uid`.  
**Alternatives:** Auth0 (more config, cost), AWS Cognito (complex), custom session auth (security burden, not justified for MVP).  
**Known limitations:** Firebase Auth on native requires careful setup of `expo-auth-session` and client configuration; Google OAuth client IDs differ between web (`.web.app` domain) and native (app package name + SHA fingerprint). Both must be configured in Google Cloud Console.

### 3.4 Database

**Selected:** Firestore (Firebase Native / Firestore in Datastore mode not needed)  
**Why:** Document model fits quiz data (nested questions, attempts). Real-time listeners are useful for quiz status updates. Works with Firebase Auth security rules out of the box. Web and native SDKs are officially supported by Firebase.  
**Alternatives:** PostgreSQL + custom API (more infrastructure to run), MongoDB (operational overhead), Supabase (good alternative but adds another provider to evaluate).  
**Known limitations:** NoSQL means denormalization and careful data modeling; complex queries require indexes; offline persistence on web is limited; vendor lock-in to Firebase (acceptable for MVP given the auth + DB integration).

### 3.5 Server-side API layer

**Selected:** A small server-side API (Node/Express or Firebase Functions) hosted separately from the client  
**Why:** Security requirement — AI provider keys must never be in client code. The API layer owns all privileged operations: AI calls, file extraction, quota enforcement, rate limiting, share-link management, and deletion jobs.  
**Deployment options evaluated:**

- **Firebase Functions:** Tight integration with Firebase Auth and Firestore; no separate hosting; generous free tier (125k invocations/month). Slight cold-start on HTTP functions.
- **Railway / Render / Fly.io:** Simple Node/Express deployment; full control; separate service to monitor.
  **Recommendation:** Start with Firebase Functions for the API layer (single provider, integrated auth rules). If cold starts or pricing become an issue, migrate to a lightweight Node service on Railway/Render.  
  **Alternatives:** AWS Lambda, Vercel Edge Functions (good but add provider count).  
  **Known limitations:** Serverless timeouts may affect long AI generations; streaming responses need care; must handle provider rate-limit errors (429) with retry/backoff.

### 3.6 AI provider integration

**Selected:** Replaceable provider interface; evaluate NVIDIA NIM → GroqCloud → Mistral  
**Interface design:**

```ts
// packages/ai/src/provider.ts
export interface AIProvider {
  generateQuiz(params: GenerateQuizParams): Promise<GeneratedQuiz>;
  gradeTheoryAnswer(params: GradeTheoryParams): Promise<GradedAnswer>;
}
export interface GenerateQuizParams {
  sourceText: string;
  questionCount: number; // 1–50
  format: 'MCQ' | 'theory' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  language?: string;
}
export interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[]; // structured, validated
}
```

**Provider evaluation (research as of 2026-10-22, unverified against live accounts):**

| Provider   | Card required?  | Free limits                                        | OpenAI-compatible?                  | Models suitable for quizzes                        | Notes                                                                                                      |
| ---------- | --------------- | -------------------------------------------------- | ----------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| NVIDIA NIM | No              | ~1,000 credits signup; 40 RPM; 10K RPD             | Yes (`integrate.api.nvidia.com/v1`) | Nemotron-3, DeepSeek-V4, GLM-5.x                   | Phone verification sometimes; production not covered by free key; model deprecation dates posted per model |
| GroqCloud  | No              | 30 RPM; 14,400 RPD (small models); 1K RPD (larger) | Yes                                 | llama-3.1-8b-instant, llama-3.3-70b, Qwen, gpt-oss | Rate limits at org level; adding card (zero spend) raises limits 10x                                       |
| Mistral    | No (phone only) | Low RPM (~1–2); ~1B tokens/month (unpublished)     | Yes (`api.mistral.ai/v1`)           | Mistral Small, Medium, Large, Codestral            | Free mode may train on data unless opted out; must activate Studio billing section                         |

**Recommendation:** Begin verification with **GroqCloud** (simplest signup, email-only, clear published limits) as primary, **NVIDIA NIM** as secondary (no card, good model variety), and **Mistral** as fallback. Verify free-tier access and quiz-quality output before writing provider-specific code.  
**Important:** Never enable paid usage without explicit owner approval. Provider-specific code goes behind the `AIProvider` interface so swapping providers requires only a new implementation, not app changes.

### 3.7 File processing

**Selected:** Server-side extraction API for PDF/DOCX; client-side TXT handling  
**Flow:**

1. Client picks file via `expo-document-picker` (web returns `File`; native returns URI).
2. Client uploads file to API layer (multipart, validated for type/size).
3. API layer extracts text:
   - **PDF:** `pdf-parse` or `pdf.js` (server-side Node). Detect scanned PDFs (no extractable text) and return a clear error.
   - **DOCX:** `mammoth.js` (server-side Node).
   - **TXT:** read as UTF-8 text.
4. Validate extracted text length (min/max), sanitize, return text to client.
5. Discard source document after extraction (retention policy).

**Web vs native:**

- Web: `expo-document-picker` returns a `File` object; can upload via `fetch`/`FormData`.
- Native: returns a `uri` (file path); read via `expo-file-system` and upload as base64 or binary. `expo-file-system` is not available on web — platform branch required.
- Alternative: client-side extraction on web (`pdf.js`, `mammoth.js` in browser) to avoid upload; but server-side is more consistent across platforms and keeps large files off the client bundle. Use server-side for MVP consistency.
  **Known limitations:** Scanned PDFs (image-only) cannot be extracted without OCR — OCR is out of scope for initial release; detect and report the limitation clearly. Large DOCX files may exceed serverless function time/memory limits — enforce size caps (e.g., 5 MB) and document them.

### 3.8 LaTeX rendering

**Selected:** KaTeX on web; RaTeX / `react-native-ratex` on native  
**Why:**

- **Web:** KaTeX is fast, has no DOM dependency issues in React Native Web, supports math/physics notation, and is widely used in education.
- **Native:** `react-native-ratex` wraps RaTeX (pure Rust, no WebView, no JavaScript math engine), works on iOS and Android, and compiles to WASM for web. Provides a single LaTeX renderer across platforms with consistent output.
  **Alternatives:** MathJax (heavier, slower), server-rendered SVG/PNG (adds latency and an extra service), `react-native-latex-renderer` (WebView mode or native SVG mode — WebView adds weight).
  **Known limitations:** `react-native-ratex` requires React Native ≥ 0.84 and the New Architecture (Fabric); verify Expo SDK compatibility before committing. Streaming AI responses with partial LaTeX (`$\frac{1` mid-stream) can crash renderers — buffer complete math blocks before rendering. Fallback: render raw LaTeX as monospaced text if the renderer fails.

### 3.9 Data model (Firestore)

**Collections:**

| Collection     | Document ID             | Fields                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`        | Firebase UID            | `email`, `displayName`, `createdAt`, `updatedAt`, `quotaDaily` (counter), `quotaMonthly` (counter), `theme` (`light`\|`dark`), `dataRetentionConsent`                                                                                                                                                                                                                                                                                                                                   |
| `quizzes`      | auto-id                 | `ownerId`, `title`, `sourceType` (`text`\|`pdf`\|`docx`\|`txt`), `sourceMetadata` (filename, size, extracted length), `format` (`MCQ`\|`theory`\|`mixed`), `difficulty`, `questionCount`, `timerSeconds` (nullable), `questions` (array of `{id, type, prompt, options?`, `correctAnswer`, `explanation`, `latexBlocks}`), `createdAt`, `updatedAt`, `isPublic` (boolean), `shareToken` (nullable, unique), `shareExpiresAt` (nullable), `revokedAt` (nullable), `deletedAt` (nullable) |
| `quizAttempts` | auto-id                 | `quizId`, `userId` (nullable for anonymous share attempts), `answers` (map of questionId → answer), `score` (nullable for theory until graded), `completedAt`, `timeSpentSeconds`                                                                                                                                                                                                                                                                                                       |
| `shareLinks`   | `shareToken`            | `quizId`, `createdAt`, `expiresAt`, `revokedAt` (nullable), `accessCount`, `maxAccess` (nullable)                                                                                                                                                                                                                                                                                                                                                                                       |
| `rateLimits`   | `{identifier}:{window}` | `count`, `resetAt`, `identifier` (`ip`\|`uid`), `window` (`minute`\|`day`)                                                                                                                                                                                                                                                                                                                                                                                                              |

**Security rules (conceptual):**

- `users`: readable/writable only by matching `request.auth.uid`.
- `quizzes`: readable by owner or by anyone with a valid unexpired share token; writable only by owner.
- `quizAttempts`: writable by authenticated user; readable by attempt owner or quiz owner.
- `shareLinks`: readable by anyone (public token); writable only by server (service account).
- All writes validated: field presence, types, size limits, no arbitrary HTML.

---

## 4. Security approach

| Requirement                               | Implementation                                                                                                                                                                                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI keys never in client                   | Keys stored as environment variables on the API layer only. Client calls `/api/generate-quiz` and `/api/grade-answer`, never the provider directly.                                                                                                  |
| Never trust client-supplied IDs/ownership | All ownership derived from Firebase Auth UID (`request.auth.uid`) in Firestore rules and API middleware. Client-supplied `userId` ignored for authorization.                                                                                         |
| Auth and DB access rules                  | Firebase Auth for identity; Firestore security rules enforce read/write ownership. API layer validates session before any privileged operation.                                                                                                      |
| Validate uploads                          | File type (PDF/DOCX/TXT only), size cap (e.g., 5 MB), MIME type verification (not just extension), extracted-text length limits (min 100 chars, max ~50K chars).                                                                                     |
| Abuse protection                          | Rate limit per IP and per UID on `/api/generate-quiz` (e.g., 10 generations/minute, 100/day per user). Return 429 with `Retry-After`. Track in Firestore `rateLimits` or in-memory store.                                                            |
| Source documents untrusted                | Treat extracted text as untrusted: no HTML rendering, no script execution, sanitize before sending to AI. Prompt construction separates system instructions from user content.                                                                       |
| Prompt injection prevention               | System prompt defines quiz-generation requirements; user document text inserted as data, not instructions. Use delimiter markers and instruct the model to treat the document as source material only.                                               |
| Share links                               | Share tokens are unguessable (24+ char random). Share links do not expose source documents — only quiz questions/answers. Expiration (`shareExpiresAt`) and revocation (`revokedAt`) enforced in API and Firestore rules. Access count optional cap. |
| Deletion                                  | Hard delete (or tombstone + background purge) for expired quizzes, share links, and source documents. No soft-delete-only behavior. Retention: history 30 days, share links 30 days, source discarded after generation.                              |

---

## 5. Shared vs platform-specific logic

| Concern                                 | Shared (TypeScript, runs web + native) | Platform-specific                                 |
| --------------------------------------- | -------------------------------------- | ------------------------------------------------- |
| AI provider interface + implementations | ✅                                     | —                                                 |
| Quiz validation schemas                 | ✅                                     | —                                                 |
| Quota / rate-limit business logic       | ✅                                     | —                                                 |
| Share-link generation/validation        | ✅                                     | —                                                 |
| Theme state (light/dark)                | ✅                                     | —                                                 |
| UI components (RNW-compatible)          | ✅ (mostly)                            | Minor platform tweaks                             |
| File picker (`DocumentPicker`)          | —                                      | ✅ (web: `File`; native: `uri` + FileSystem)      |
| File upload to API                      | ✅ (adapter per platform)              | ✅ (adapter per platform)                         |
| PDF/DOCX extraction                     | —                                      | ✅ (server-side only, consistent)                 |
| LaTeX rendering                         | —                                      | ✅ (web: KaTeX; native: RaTeX/react-native-ratex) |
| Google sign-in                          | —                                      | ✅ (web: Firebase SDK; native: Expo AuthSession)  |
| Deep linking / share URLs               | ✅ (route handling)                    | ✅ (native linking config)                        |
| Local storage / offline                 | ✅ (AsyncStorage)                      | ✅ (same API, different native impl)              |

---

## 6. Deployment plan

| Component               | Deployment target                                  | Rationale                                                                                   |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Client (Expo web build) | Firebase Hosting or Vercel                         | Static hosting, free tier, custom domain, CLI deployment                                    |
| API layer               | Firebase Functions (recommended) or Railway/Render | Integrated with Firebase Auth/Firestore; no separate server to manage; free tier covers MVP |
| Firebase project        | Firebase console (Spark plan)                      | Auth + Firestore + Hosting + Functions; generous free limits                                |
| Native builds (later)   | EAS Build (Expo)                                   | Cloud builds for iOS/Android; no local macOS required for iOS                               |
| CI/CD                   | GitHub Actions                                     | Lint, type-check, tests, deploy on push to main                                             |

**Free-tier fit:** Firebase Spark plan includes Auth, Firestore (1 GB storage, 50k reads/day), Hosting (1 GB), and Functions (125k invocations/month) — sufficient for MVP without a credit card. Verify current Firebase free-tier limits before committing.

---

## 7. Compatibility risks and known limitations

| Risk                                                       | Severity | Mitigation                                                                                                                   |
| ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| React Native Web incompatibility with DOM-dependent libs   | High     | Audit all dependencies; prefer React Native Web-compatible libraries; avoid `window`/`document` direct access in shared code |
| `expo-file-system` unavailable on web                      | Medium   | Platform branch: web uses `File` from DocumentPicker; native uses FileSystem read + upload                                   |
| `react-native-ratex` requires RN ≥ 0.84 + New Architecture | Medium   | Verify Expo SDK version compatibility before adding; fallback to raw LaTeX text rendering on native                          |
| Scanned PDFs (image-only) not extractable                  | Medium   | Detect no-text PDFs; return clear user-facing error; OCR out of scope for v1                                                 |
| Serverless function timeouts on long AI generations        | Medium   | Stream responses where possible; enforce generation timeout; retry with backoff on 429                                       |
| Firebase Auth native vs web OAuth config differences       | Low      | Configure both web and iOS/Android client IDs in Google Cloud Console; test on both platforms                                |
| Provider free-tier limits may change                       | Medium   | Monitor usage; provider abstraction allows switching; never enable paid usage without approval                               |
| Firestore NoSQL modeling for quiz attempts                 | Low      | Denormalize intentionally; add indexes as needed; keep queries simple                                                        |

---

## 8. MVP scope (Phase 1 → Phase 2 boundary)

**In MVP:**

- Google sign-in (Firebase Auth)
- Home screen: centered single-column quiz generation
- Input: pasted text or one uploaded PDF/DOCX/TXT
- Generate MCQ quizzes (theory/mixed in later phases), up to 50 questions
- Difficulty selection, optional timer
- Quiz-taking flow with progress and timer
- Results: score, correct answers, explanations
- Quiz history (30-day retention)
- Shareable quiz URLs (30-day expiry, revocable)
- Light/dark theme
- LaTeX rendering (KaTeX web; RaTeX native)

**Out of MVP:**

- Theory-question AI grading (Phase 3+)
- OCR for scanned PDFs
- iOS/Android native builds (Phase 3+)
- Payment / paid tiers
- Advanced analytics, dashboards, invented statistics

---

## 9. Ordered implementation roadmap

1. **Phase 1 (current):** Architecture validation and documentation. Verify AI provider free-tier access (GroqCloud → NVIDIA NIM → Mistral). Verify PDF/DOCX extraction, LaTeX rendering, and Google sign-in on web and native. Record results. **Stop for owner approval before scaffolding.**
2. **Phase 2:** Scaffold Expo + React Native Web + TypeScript project. Set up Firebase Auth (Google sign-in) and Firestore with security rules. Build the server-side API layer with replaceable AI provider interface. Implement quiz generation (MCQ only) and basic quiz-taking/results.
3. **Phase 3:** Quiz history, shareable links, light/dark theme, LaTeX rendering, file upload (PDF/DOCX/TXT), theory questions with AI-assisted grading.
4. **Phase 4:** Native iOS/Android builds via EAS, OCR evaluation, production hardening, quota monitoring, retention cleanup jobs.

---

## 10. Commands not yet run / validation pending

The following have **not** been run and must be executed before full implementation:

- `npx create-expo-app quizzle --template blank-typescript` — scaffold check (not yet run; repo is empty by design)
- `npm install firebase expo-router expo-document-picker expo-file-system @react-native-async-storage/async-storage` — dependency check
- Provider sign-up and test calls:
  - GroqCloud: `console.groq.com` → API key → test chat completion with `llama-3.1-8b-instant`
  - NVIDIA NIM: `build.nvidia.com` → Developer Program → API key → test `nemotron-3` or `deepseek-v4.1-flash`
  - Mistral: `console.mistral.ai` → API key → test `mistral-small` or `codestral`
- Firebase project creation, Auth configuration (web + native Google clients), Firestore rules deployment
- `expo start` and web build verification
- LaTeX rendering test: KaTeX on web, `react-native-ratex` on native (requires native build or simulator)
- PDF/DOCX extraction test with sample files

These are recorded here so another model can continue without this conversation.

---

**Approval requested:** Confirm the architecture above (stack, data model, security, provider order, deployment) before Phase 2 scaffolding begins. Any changes should be recorded in `CHANGELOG.md` and reflected in `PROJECT_CONTEXT.md` and `NEXT_STEPS.md`.
