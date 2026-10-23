-- Quizzle — quiz soft delete.
--
-- Why this needs a function at all:
--
-- The SELECT policy on public.quizzes excludes soft-deleted rows
-- (`deleted_at is null`), so a deleted quiz disappears from its owner's
-- history immediately. That is the behaviour we want, but it collides with a
-- PostgreSQL rule: when a row is UPDATEd, the resulting row is re-checked
-- against the table's SELECT policies. A plain
--
--     update public.quizzes set deleted_at = now() where id = ...
--
-- therefore fails with "new row violates row-level security policy" — the row
-- the owner is trying to produce is one the policy says they may not see.
-- PostgreSQL does not allow WITH CHECK on a SELECT policy, so the policy
-- itself cannot be relaxed for this one operation.
--
-- Exposing deletion as a SECURITY DEFINER function resolves it cleanly: the
-- function checks ownership explicitly, performs the update with the policy
-- out of the picture, and leaves RLS strict for every other path.

create or replace function public.soft_delete_quiz(p_quiz_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_uid   uuid := auth.uid();
begin
  -- The caller must be authenticated. auth.uid() is null for anon, and a null
  -- would otherwise compare as "not equal" and silently do nothing.
  if v_uid is null then
    return false;
  end if;

  select owner_id into v_owner
  from public.quizzes
  where id = p_quiz_id;

  -- Not found, or owned by someone else: report failure without revealing
  -- whether the row exists.
  if v_owner is null or v_owner <> v_uid then
    return false;
  end if;

  update public.quizzes
     set deleted_at = coalesce(deleted_at, now())
   where id = p_quiz_id
     and owner_id = v_uid;

  return true;
end;
$$;

comment on function public.soft_delete_quiz(uuid) is
  'Marks one of the caller''s own quizzes as deleted. Returns false if the '
  'caller is anonymous or does not own the quiz. Deleted quizzes are hidden '
  'by the SELECT policy and are never purged automatically.';

revoke execute on function public.soft_delete_quiz(uuid) from public;
revoke execute on function public.soft_delete_quiz(uuid) from anon;
revoke execute on function public.soft_delete_quiz(uuid) from service_role;
grant execute on function public.soft_delete_quiz(uuid) to authenticated;
