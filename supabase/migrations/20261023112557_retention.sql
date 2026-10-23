-- Quizzle — retention encoding (schema-level).
--
-- This migration records the approved retention rules in the database. It does
-- NOT schedule or perform any deletion: the sweep itself is a later phase so
-- that destructive automation is reviewed before it runs. What is defined here
-- is the *eligibility* predicate, which is the part that must be correct and
-- reviewable.
--
-- Approved policy (PROJECT_CONTEXT.md §7, plus owner decisions for this phase):
--   * Share links are temporary. They expire at most 30 days after creation
--     (enforced by share_links_window_check) and are purged 30 days after they
--     stop being usable.
--   * Quiz history, attempts and answers are USER-OWNED records. They are
--     never deleted automatically. A user may delete them; the system may not.
--   * Source documents are never persisted at all — quizzes store only
--     source_meta (filename, size, extracted length). See the lifecycle note
--     at the end of this file.
--
-- Consequently the view below lists share_links and nothing else. If quiz
-- history is ever to expire, that requires a fresh owner decision and a new
-- migration — it must not silently appear here.

create view public.retention_purge_candidates
with (security_invoker = true)
as
select
  'share_links'::text as table_name,
  s.id                as record_id,
  s.expires_at,
  s.revoked_at
from public.share_links s
where
  -- Expired more than 30 days ago.
  s.expires_at < now() - interval '30 days'
  -- Or revoked more than 30 days ago.
  or (s.revoked_at is not null and s.revoked_at < now() - interval '30 days');

comment on view public.retention_purge_candidates is
  'Temporary records eligible for permanent deletion. Share links only: '
  'quiz history and attempts are user-owned and are never purged '
  'automatically. Read by the scheduled cleanup job in a later phase.';

-- security_invoker = true means the caller's RLS applies, so a client sees
-- only rows it could already see. Revoke anyway so the view is not an
-- accidental new read path, then grant only to the server role.
revoke all on public.retention_purge_candidates from public;
revoke all on public.retention_purge_candidates from anon;
revoke all on public.retention_purge_candidates from authenticated;
grant select on public.retention_purge_candidates to service_role;

-- ---------------------------------------------------------------------------
-- Source-document lifecycle (database implications only — NOT implemented here)
-- ---------------------------------------------------------------------------
-- Document processing is a later phase. Recording the intended lifecycle now
-- because it constrains the schema:
--
--   1. The client submits a document (PDF/DOCX/TXT) or pasted text directly to
--      a trusted Edge Function. No Storage bucket is created; the approved
--      policy is "process then discard", and a persistent bucket would only
--      add a retention and access-control burden.
--   2. The function extracts text in memory where feasible. A private
--      temporary object is used only if a provider retry makes it necessary.
--   3. The extracted text is sent to the selected AI provider server-side.
--      Provider credentials never leave the server.
--   4. The temporary source is deleted only AFTER generation succeeds AND the
--      quiz row is confirmed persisted. It is never deleted on upload.
--   5. While the source is retained, transient provider failures can be
--      retried against the same source.
--   6. Abandoned uploads and failed jobs are removed by a short expiry
--      (hours, not days) plus automated cleanup.
--   7. Pasted text is treated identically to an uploaded document.
--   8. Document contents, extracted text, credentials and personal data are
--      never written to logs. generation_log records only status, error_code
--      and provider.
--   9. quizzes.source_meta holds at most filename, byte size and extracted
--      length — never document content.
--
-- Database implications for this phase: quizzes.source_meta already satisfies
-- point 9, and generation_log already satisfies point 8 by having no column
-- able to hold document text. No additional table is created for temporary
-- sources yet, because none can be exercised until uploads exist; it will
-- arrive with the processing phase.
