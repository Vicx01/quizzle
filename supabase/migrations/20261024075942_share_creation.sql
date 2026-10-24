-- Quizzle — share-link creation.
--
-- WHY A FUNCTION, NOT A CLIENT INSERT
--
-- public.share_links has a single SELECT policy (creator may list their own)
-- and deliberately NO insert policy. A client cannot mint a link, and cannot
-- inflate or reset access_count. Links are bearer credentials, so only the
-- server issues them.
--
-- WHY SECURITY DEFINER
--
-- It is called by an Edge Function using the service-role key, which BYPASSES
-- row-level security. There is no policy here to fall back on, so ownership is
-- checked explicitly inside the function. Removing that check would let any
-- caller mint a link for any quiz, and nothing else in the schema would stop
-- it. The check is therefore part of the contract, not a belt-and-braces extra.
--
-- WHY THE TOKEN ARRIVES AS AN ARGUMENT
--
-- The raw token is hashed in SQL, so it is never stored, never logged as a
-- column value, and never needs to be sent as a separate statement. It is
-- returned to the caller exactly once and is unrecoverable afterwards.

create or replace function public.create_share_link(
  p_quiz_id    uuid,
  p_token      text,
  p_expires_at timestamptz,
  p_max_access integer,
  p_owner_id   uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_id    uuid;
begin
  -- AUTHORITATIVE OWNERSHIP CHECK. p_owner_id is supplied by the Edge Function
  -- after it has verified a JWT against GoTrue, but this function does not
  -- trust it blindly: it re-derives the quiz's real owner and compares.
  select q.owner_id into v_owner
  from public.quizzes q
  where q.id = p_quiz_id
    and q.deleted_at is null;

  if v_owner is null or v_owner <> p_owner_id then
    -- One response for "no such quiz" and "not your quiz", so this cannot be
    -- used to enumerate quiz ids.
    raise exception 'quiz_not_available'
      using errcode = 'restrict_violation';
  end if;

  if p_token is null or length(p_token) < 22 then
    raise exception 'invalid_token'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The 30-day cap and "expires after it was created" are enforced by the
  -- table's CHECK constraints, so a bad value fails the insert rather than
  -- being silently accepted here.

  insert into public.share_links
    (quiz_id, created_by, token_hash, expires_at, max_access)
  values (
    p_quiz_id,
    p_owner_id,
    sha256(convert_to(p_token, 'UTF8')),
    p_expires_at,
    p_max_access
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.create_share_link(uuid, text, timestamptz, integer, uuid) is
  'Mints a share link for a quiz the caller owns. Hashes the token with '
  'SHA-256 so only the digest is stored. Raises if the quiz does not exist, '
  'is soft-deleted, or is not owned by p_owner_id. Callable by service_role only.';

-- Revoke before granting: functions are executable by PUBLIC by default and
-- Supabase's default privileges grant EXECUTE to anon/authenticated.
revoke execute on function public.create_share_link(uuid, text, timestamptz, integer, uuid) from public;
revoke execute on function public.create_share_link(uuid, text, timestamptz, integer, uuid) from anon;
revoke execute on function public.create_share_link(uuid, text, timestamptz, integer, uuid) from authenticated;
grant execute on function public.create_share_link(uuid, text, timestamptz, integer, uuid) to service_role;
