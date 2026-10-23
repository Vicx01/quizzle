# Shared quizzes — server-side API contract

**Status: IMPLEMENTED as two Supabase Edge Functions, NOT yet deployed or executed.**

| Endpoint                  | Source                              | Status                      |
| ------------------------- | ----------------------------------- | --------------------------- |
| Resolve a share link      | `supabase/functions/share-resolve/` | Implemented, **unexecuted** |
| Submit + grade an attempt | `supabase/functions/share-attempt/` | Implemented, **unexecuted** |

The document below is the contract those functions implement. Every requirement
in it is met in code, and the security-critical parts (the response allowlist,
server-side grading, and the one-generic-404 rule) are covered by **24 unit
tests** in `tests/functions/share.test.ts` and **10 database tests** in
`tests/database/share.test.mjs`.

**Nothing has been run against the hosted project.** The functions are not
deployed, and this environment cannot reach the Supabase host to invoke them
even if they were. See "Verification status" at the end.

---

## Why sharing is server-mediated

`firestore.rules` v3 gives **no client** — authenticated or not — read access to
a quiz it does not own. There is deliberately no public read path.

The reason is the shape of the data. Per ARCHITECTURE.md §3.9 the quiz document
embeds:

```
questions[].correctAnswer
questions[].explanation
```

Firestore security rules cannot redact individual fields from a document read.
Allowing a non-owner to read the document means handing them the answer key, so
anyone with a share link could read every answer before attempting the quiz.

The fix is that **the quiz is never read directly by a sharer**. A server
endpoint reads it with the Admin SDK (which bypasses rules) and returns only the
fields needed to take the quiz.

---

## Endpoint 1 — resolve a share link

```
GET /api/share/:token
```

Runs with Admin SDK privileges. No authentication required: possession of the
token is the authorisation.

### Validation — all must pass, else `404`

1. `shareLinks/{token}` **exists**.
2. `revokedAt` is **null**.
3. `expiresAt` is in the **future** (`> now`).
4. If `maxAccess` is set, `accessCount < maxAccess`.
5. The referenced quiz exists and `deletedAt` is **null**.

Any failure returns **404, not 403 or 400**. Distinguishing "expired" from
"revoked" from "never existed" turns the endpoint into a token oracle and leaks
whether a given link was ever valid. One generic `404` for every failure.

### Side effect

Atomically increment `accessCount` (use a transaction or `FieldValue.increment`)
so concurrent requests cannot exceed `maxAccess`.

### Response — allowlist

Return **only** these fields:

```json
{
  "quizId": "…",
  "title": "…",
  "format": "MCQ",
  "difficulty": "Easy",
  "questionCount": 10,
  "timerSeconds": null,
  "questions": [
    {
      "id": "qn1",
      "type": "MCQ",
      "prompt": "…",
      "options": ["…", "…"],
      "latexBlocks": []
    }
  ]
}
```

### Never returned

| Field                                                 | Why                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `questions[].correctAnswer`                           | the answer key                                                |
| `questions[].explanation`                             | reveals reasoning behind the answer                           |
| `ownerId`, `ownerEmail`                               | private owner identity                                        |
| `sourceMetadata`, `sourceType`, extracted source text | the brief states share links must not expose source documents |
| `shareToken`, `isPublic`, `revokedAt`                 | internal sharing state                                        |
| `createdAt` / `updatedAt`                             | not needed to take a quiz                                     |

Build the response from an **explicit allowlist**, never by deleting keys from
the stored document. A denylist silently leaks every field added later.

---

## Endpoint 2 — submit an attempt

```
POST /api/share/:token/attempts
```

### Validation — all server-side

1. Re-run the full share-link validation from Endpoint 1.
2. `answers` is an object/map of question id → answer.
3. Every question id present in `answers` **exists in the quiz**; reject unknown
   or extra ids.
4. Each answer matches the expected type for that question (`MCQ` → one of the
   supplied `options`; `theory` → string, length-bounded).
5. Reject empty or oversized payloads.

### Grading

Graded **server-side only**. The client never receives the answer key, so it
cannot be trusted to grade itself — and a client-side grade would leak answers
to anyone reading the network tab or the bundle.

### Response — after grading only

```json
{
  "attemptId": "…",
  "score": 8,
  "total": 10,
  "perQuestion": [
    { "id": "qn1", "correct": true, "explanation": "…" },
    { "id": "qn2", "correct": false, "explanation": "…" }
  ]
}
```

`correctAnswer` and `explanation` are returned **only here, after submission**.
Never before.

Theory questions are graded against a transparent rubric with a
review/self-assessment option, per the approved approach in PROJECT_CONTEXT.md.

---

## Cross-cutting requirements

- **Rate limit** per IP and per token; return `429` with `Retry-After`.
- **Atomic** `accessCount` increments.
- **Logging** must never record the token in full, nor any answer key.
- **Transport**: HTTPS only; set `Cache-Control: no-store` on both responses so
  quizzes and scores are not cached by intermediaries.
- **CORS**: restrict to the app origin.

---

## What the rules still guarantee

Server-mediated sharing does not weaken the rules. They continue to enforce:

- quizzes are **owner-only** for every client;
- clients **cannot write** `shareLinks` or `rateLimits`, so a user cannot mint
  or revoke a link for their own quiz;
- `ownerId` is immutable, so ownership cannot be transferred;
- a deny-by-default catch-all for anything unmatched.

The server is the only component that can read another user's quiz, and only
through the Admin SDK.

---

## Open questions for the owner

1. Should `shareLinks` remain world-readable in the rules? It no longer needs to
   be — the API resolves tokens. Setting it to `if false` would tighten things
   further, at the cost of clients being unable to inspect a link's metadata
   directly.
2. Anonymous attempts: `quizAttempts.userId` is nullable in the data model for
   anonymous share attempts. Confirm whether share attempts should be recorded
   anonymously, and how that interacts with retention policy.

---

## Verification status

**NOT executed.** Distinguish carefully:

- **Verified** — 24 unit tests over the allowlist, grading, validation, token
  handling and rate limiting; 10 executed database tests proving the underlying
  SQL primitives behave, including that `resolve_share_link` and
  `record_share_access` are callable **only** by `service_role` (both anon and
  authenticated are refused with `42501`). The authenticated case was
  mutation-tested: granting it makes the test fail.
- **NOT verified** — the functions have never been invoked. They are not
  deployed, and this sandbox cannot reach `ppswtryoescehrytxvsh.supabase.co` to
  call them. Request handling, cold-start behaviour, CORS in the real gateway,
  and the `SUPABASE_SERVICE_ROLE_KEY` wiring are all unproven.
- **NOT typechecked** — Deno is not installed in this environment. The
  functions are excluded from the app's tsconfig and ESLint config; run
  `deno check supabase/functions/*/index.ts` before deploying.

### Deploying

```bash
supabase functions deploy share-resolve
supabase functions deploy share-attempt
```

Both must run **without** JWT verification — possession of the share token is
the authorisation, and a taker has no session. With the CLI this means
`--no-verify-jwt`; in the dashboard, uncheck "Enforce JWT verification".

Once deployed, add the app origin to `ALLOWED_ORIGINS` if it is not one of the
defaults in `supabase/functions/_shared/respond.ts`.

### Still missing before sharing works end to end

There is **no way to create a share link yet**. `share_links` rows are inserted
directly by tests; no screen or endpoint mints one. Until link creation exists,
these functions are inert — every request resolves to a 404, correctly.
