-- =============================================================================
-- Fix: tasks INSERT under shared categories fails RLS
-- Run in Supabase SQL editor NOW.
--
-- Symptom: "new row violates row-level security policy for table \"tasks\""
-- when creating a task (e.g. under Primon) as admin or member.
--
-- Causes addressed:
-- 1) INSERT ... RETURNING / .select() re-checks SELECT RLS via
--    user_can_access_task(id), which re-read tasks under the same policy.
-- 2) Helpers that read tasks/categories must use row_security = off.
--
-- Fix: own-row access is inline (user_id = auth.uid()); shared access uses
-- category helpers without re-selecting the task row for the owner case.
-- =============================================================================

BEGIN;

-- Helpers that touch tables under RLS
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

create or replace function public.user_can_use_category(p_category_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text;
  v_owner uuid;
  v_parent_id uuid;
  v_active boolean;
begin
  if p_category_id is null or v_uid is null then
    return false;
  end if;

  select scope, user_id, parent_id, active
  into v_scope, v_owner, v_parent_id, v_active
  from public.categories
  where id = p_category_id;

  if v_scope is null then
    return false;
  end if;

  if v_scope = 'personal' then
    return v_owner = v_uid;
  end if;

  if public.is_app_admin() then
    return true;
  end if;

  if not v_active then
    return false;
  end if;

  if v_parent_id is null then
    return exists (
      select 1
      from public.user_category_access g
      where g.user_id = v_uid
        and g.category_id = p_category_id
    );
  end if;

  return exists (
    select 1
    from public.user_category_access g
    where g.user_id = v_uid
      and g.category_id = v_parent_id
  );
end;
$$;

revoke all on function public.user_can_use_category(uuid) from public;
grant execute on function public.user_can_use_category(uuid) to authenticated;

-- True when category is a shared/global workspace the caller may use
create or replace function public.user_can_access_shared_category(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    p_category_id is not null
    and not public.task_category_is_personal(p_category_id)
    and public.user_can_use_category(p_category_id),
    false
  );
$$;

revoke all on function public.user_can_access_shared_category(uuid) from public;
grant execute on function public.user_can_access_shared_category(uuid) to authenticated;

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

  return public.user_can_access_shared_category(v_category_id);
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
     and public.user_can_access_shared_category(v_category_id) then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.user_can_delete_task(uuid) from public;
grant execute on function public.user_can_delete_task(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Recreate tasks policies — OWN rows inline (no helper re-read)
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'tasks'
  loop
    execute format('drop policy if exists %I on public.tasks', r.policyname);
  end loop;
end;
$$;

create policy "Users select accessible tasks"
  on public.tasks for select to authenticated
  using (
    public.is_app_allowed()
    and (
      user_id = auth.uid()
      or public.user_can_access_shared_category(category_id)
    )
  );

create policy "Users insert own tasks"
  on public.tasks for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_app_allowed()
    and (
      category_id is null
      or public.user_can_use_category(category_id)
    )
  );

create policy "Users update accessible tasks"
  on public.tasks for update to authenticated
  using (
    public.is_app_allowed()
    and (
      user_id = auth.uid()
      or public.user_can_access_shared_category(category_id)
    )
  )
  with check (
    public.is_app_allowed()
    and (
      user_id = auth.uid()
      or public.user_can_access_shared_category(category_id)
    )
  );

create policy "Users delete deletable tasks"
  on public.tasks for delete to authenticated
  using (
    public.is_app_allowed()
    and (
      user_id = auth.uid()
      or (
        public.is_app_admin()
        and public.user_can_access_shared_category(category_id)
      )
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
