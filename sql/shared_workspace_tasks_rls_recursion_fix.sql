-- =============================================================================
-- Hotfix: RLS recursion on tasks helpers
-- Run in Supabase SQL editor if INSERT into tasks fails with:
--   "new row violates row-level security policy for table \"tasks\""
--
-- Cause: INSERT ... RETURNING / .select() re-checks SELECT policy, which called
-- user_can_access_task() which SELECTed tasks under the same RLS → fail.
-- Fix: SET row_security = off on the SECURITY DEFINER helpers.
-- =============================================================================

BEGIN;

create or replace function public.task_category_is_personal(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (
      select c.scope = 'personal'
      from public.categories c
      where c.id = p_category_id
    ),
    false
  );
$$;

revoke all on function public.task_category_is_personal(uuid) from public;
grant execute on function public.task_category_is_personal(uuid) to authenticated;

create or replace function public.user_can_access_task(p_task_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_category_id uuid;
begin
  if v_uid is null or not public.is_app_allowed() then
    return false;
  end if;

  select t.user_id, t.category_id
  into v_owner, v_category_id
  from public.tasks t
  where t.id = p_task_id;

  if not found then
    return false;
  end if;

  if v_owner = v_uid then
    return true;
  end if;

  if v_category_id is null then
    return false;
  end if;

  if public.task_category_is_personal(v_category_id) then
    return false;
  end if;

  return public.user_can_use_category(v_category_id);
end;
$$;

revoke all on function public.user_can_access_task(uuid) from public;
grant execute on function public.user_can_access_task(uuid) to authenticated;

create or replace function public.user_can_mutate_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.user_can_access_task(p_task_id);
$$;

revoke all on function public.user_can_mutate_task(uuid) from public;
grant execute on function public.user_can_mutate_task(uuid) to authenticated;

create or replace function public.user_can_delete_task(p_task_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_category_id uuid;
begin
  if v_uid is null or not public.is_app_allowed() then
    return false;
  end if;

  select t.user_id, t.category_id
  into v_owner, v_category_id
  from public.tasks t
  where t.id = p_task_id;

  if not found then
    return false;
  end if;

  if v_owner = v_uid then
    return true;
  end if;

  if public.is_app_admin()
     and v_category_id is not null
     and not public.task_category_is_personal(v_category_id) then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.user_can_delete_task(uuid) from public;
grant execute on function public.user_can_delete_task(uuid) to authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
