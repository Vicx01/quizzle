-- Quizzle — share-link resolution primitive.
--
-- This is NOT the sharing API. It is the single piece of database logic that
-- decides whether a share token is currently usable, written here because it
-- is a data rule (expiry, revocation, access limits) rather than an endpoint.
-- The future Edge Function calls it under service_role; no HTTP surface is
-- added by this migration.
--
-- Why it exists in this phase at all: "expired and revoked share links cannot
-- grant access" is only a testable claim if the accept/reject decision lives
-- somewhere executable. Putting it in the database makes it verifiable now, in
-- one place, instead of being re-implemented—and potentially got wrong—inside
-- each future function.
--
-- Why it is SECURITY DEFINER: share_links has no client SELECT policy, so an
-- ordinary caller could not read the row it needs to validate. Running as the
-- owner lets it read exactly that row. It returns only identifiers; the caller
-- (service_role) then fetches quiz content through its own path.

create or replace function public.resolve_share_link(p_token text)
returns table (share_link_id uuid, quiz_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.quiz_id
  from public.share_links s
  where
    -- Constant-time-ish lookup by hash. The raw token is never stored.
    s.token_hash = sha256(convert_to(p_token, 'UTF8'))
    -- Revoked links are dead permanently.
    and s.revoked_at is null
    -- Expiry is checked against now(), not against a client-supplied clock.
    and s.expires_at > now()
    -- Optional access cap; null means unlimited.
    and (s.max_access is null or s.access_count < s.max_access);
$$;

comment on function public.resolve_share_link(text) is
  'Returns (share_link_id, quiz_id) for a currently usable share token, or '
  'zero rows if the token is unknown, revoked, expired, or exhausted. '
  'Callable by service_role only.';

-- Functions are executable by PUBLIC by default, and Supabase's default
-- privileges grant EXECUTE to anon/authenticated. Neither should be able to
-- probe tokens, so revoke first and then grant narrowly.
revoke execute on function public.resolve_share_link(text) from public;
revoke execute on function public.resolve_share_link(text) from anon;
revoke execute on function public.resolve_share_link(text) from authenticated;
grant execute on function public.resolve_share_link(text) to service_role;

-- ---------------------------------------------------------------------------
-- Access-count increment
-- ---------------------------------------------------------------------------
-- access_count is authoritative, so it is only ever incremented here, under
-- the same SECURITY DEFINER path, after a link has been resolved as usable.
-- Clients have no policy that can touch share_links, so a user cannot inflate
-- or reset their own counts.
--
-- Returns the new count, or null if the token is no longer usable (so the
-- caller can treat a stale link uniformly with resolve_share_link).

create or replace function public.record_share_access(p_token text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  update public.share_links s
     set access_count = s.access_count + 1
   where s.token_hash = sha256(convert_to(p_token, 'UTF8'))
     and s.revoked_at is null
     and s.expires_at > now()
     and (s.max_access is null or s.access_count < s.max_access)
  returning s.access_count into v_new_count;

  return v_new_count;
end;
$$;

comment on function public.record_share_access(text) is
  'Atomically increments access_count for a usable share token. Returns the '
  'new count, or null if the token is unknown, revoked, expired or '
  'exhausted. Callable by service_role only.';

revoke execute on function public.record_share_access(text) from public;
revoke execute on function public.record_share_access(text) from anon;
revoke execute on function public.record_share_access(text) from authenticated;
grant execute on function public.record_share_access(text) to service_role;
