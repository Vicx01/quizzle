# Shared quizzes — server-side API contract

**Status: IMPLEMENTED as three Supabase Edge Functions and DEPLOYED (2026-10-24). Not yet exercised over live HTTP — see "Verification status".**

| Endpoint                     | Source                              | Status                      |
| ---------------------------- | ----------------------------------- | --------------------------- |
| Resolve a share link         | `supabase/functions/share-resolve/` | Deployed, **live-untested** |
| Submit + grade an attempt    | `supabase/functions/share-attempt/` | Deployed, **live-untested** |
| Create / revoke / list links | `supabase/functions/share-links/`   | Deployed, **live-untested** |

The document below is the contract those functions implement. Every requirement
in it is met in code, and the security-critical parts (the response allowlist,
server-side grading, and the one-generic-404 rule) are covered by **24 unit
tests** in `tests/functions/share.test.ts` and **17 database tests** in
`tests/database/share.test.mjs`.

The functions **are deployed** to the hosted project (2026-10-24) together
with the `create_share_link` migration, and the deployed bodies were read
back and verified. This sandbox still cannot reach the Supabase host over
HTTP, so **no live invocation has been performed from here**. See
"Verification status" at the end.

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

**Deployed, but not yet exercised over live HTTP.** Distinguish carefully:

- **Verified** — 24 unit tests over the allowlist, grading, validation, token
  handling and rate limiting; 17 executed database tests proving the
  underlying SQL primitives behave, including that `resolve_share_link`,
  `record_share_access` and `create_share_link` are callable **only** by
  `service_role` (both anon and authenticated are refused with `42501`) and
  that `create_share_link` refuses non-owners. The authenticated-caller case
  and the ownership check were mutation-tested.
- **Verified on the hosted project** — the migration is applied
  (`20261024075942_share_creation`); all three primitives are SECURITY
  DEFINER with EXECUTE granted to `service_role` only (checked via
  `pg_proc`); all three Edge Functions are ACTIVE and their bodies were read
  back and compared with the tested bundles; project health is green.
- **NOT verified** — no function has been invoked through the real gateway.
  This sandbox cannot reach `ppswtryoescehrytxvsh.supabase.co` over HTTP, so
  request handling, cold-start behaviour, CORS in the real gateway, and the
  `SUPABASE_SERVICE_ROLE_KEY` wiring at runtime remain unproven until the
  owner's first live run.
- **NOT typechecked with Deno** — Deno is not installed in this environment
  (its release binary redirects to a blocked host). The deployed bundles
  instead passed TypeScript transpile (0 syntax errors) and an
  unresolved-name check (0 non-global names). Run
  `deno check supabase/functions/*/index.ts` when Deno is available.

### Deployment

Deployed 2026-10-24 via the Supabase Management API (MCP). That API accepts
a single source file, so `npm run functions:bundle`
(`scripts/bundle-functions.mjs`) inlines the `_shared/` modules into
`.deploy-bundle/<slug>/index.ts` first. To redeploy with the CLI instead:

```bash
supabase functions deploy share-resolve --no-verify-jwt
supabase functions deploy share-attempt --no-verify-jwt
supabase functions deploy share-links
```

`share-resolve` and `share-attempt` run **without** JWT verification —
possession of the share token is the authorisation, and a taker has no
session. `share-links` runs **with** JWT verification.

Add the app origin to `ALLOWED_ORIGINS` if it is not one of the defaults in
`supabase/functions/_shared/respond.ts`.

### End-to-end path

Link creation now exists: `share-links` mints links for the quiz owner, the
History screen exposes create/list/revoke, and `?share=<token>` opens the
take-quiz screen. What remains is the first live end-to-end run against the
deployed functions (this sandbox cannot reach the Supabase host over HTTP).
