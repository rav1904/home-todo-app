-- =============================================================================
-- Shared workspace tasks
-- Run in Supabase SQL editor AFTER sql/app_access_control.sql
-- (and sql/categories_personal_and_access.sql).
--
-- Model:
--   - Personal + null-category tasks: owner-only
--   - Global top-level categories: shared workspaces via user_category_access
--   - Subcategories inherit top-level membership
--   - Admin can see/edit all shared/global tasks, never others' Personal/null
--   - Delete: creator OR admin (shared only)
--   - Recurrence spawn keeps parent.user_id as creator
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Optional admin note on categories (workspace clarity)
-- -----------------------------------------------------------------------------
alter table public.categories
  add column if not exists admin_note text;

comment on column public.categories.admin_note is
  'Optional admin-only note to clarify workspace purpose (e.g. Shopping for User X).';

-- -----------------------------------------------------------------------------
-- 1) Helpers
-- -----------------------------------------------------------------------------
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

  -- Always own tasks (Personal, null-category, or shared)
  if v_owner = v_uid then
    return true;
  end if;

  -- Others' null-category / Personal: never
  if v_category_id is null then
    return false;
  end if;

  if public.task_category_is_personal(v_category_id) then
    return false;
  end if;

  -- Shared/global: membership (admin can use all globals via user_can_use_category)
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

  -- Admin may delete others' shared/global tasks only
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

-- Creator profiles for visible shared tasks (no blanket auth.users exposure)
create or replace function public.get_task_creator_profiles(p_user_ids uuid[])
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_app_allowed() then
    return;
  end if;

  if p_user_ids is null or cardinality(p_user_ids) = 0 then
    return;
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'User'
    )::text as display_name,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'picture'), '')
    )::text as avatar_url
  from auth.users u
  where u.id = any (p_user_ids);
end;
$$;

revoke all on function public.get_task_creator_profiles(uuid[]) from public;
grant execute on function public.get_task_creator_profiles(uuid[]) to authenticated;

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

  -- global
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

-- -----------------------------------------------------------------------------
-- 2) Category assignment trigger — block shared → others' Personal moves
-- -----------------------------------------------------------------------------
create or replace function public.tasks_enforce_category_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent public.tasks%rowtype;
  v_uid uuid := auth.uid();
begin
  if new.category_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.category_id is not distinct from old.category_id then
    return new;
  end if;

  if tg_op = 'INSERT' and new.spawned_from_task_id is not null then
    select *
    into v_parent
    from public.tasks
    where id = new.spawned_from_task_id;

    if not found then
      raise exception 'spawned_from_task_id parent not found';
    end if;

    if v_parent.user_id is distinct from new.user_id then
      raise exception 'spawned task user_id must match parent user_id';
    end if;

    if new.category_id is distinct from v_parent.category_id then
      raise exception 'spawned task category_id must match parent category_id';
    end if;

    return new;
  end if;

  if not public.user_can_use_category(new.category_id) then
    raise exception 'Not allowed to assign this category';
  end if;

  -- Members must not move someone else's task into a Personal category
  if public.task_category_is_personal(new.category_id) then
    if new.user_id is distinct from v_uid then
      raise exception 'Cannot move another user''s task into a Personal category';
    end if;

    if exists (
      select 1
      from public.categories c
      where c.id = new.category_id
        and c.scope = 'personal'
        and c.user_id is distinct from v_uid
    ) then
      raise exception 'Not allowed to assign this Personal category';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_enforce_category_access_trg on public.tasks;
create trigger tasks_enforce_category_access_trg
  before insert or update of category_id, spawned_from_task_id, user_id
  on public.tasks
  for each row
  execute function public.tasks_enforce_category_access();

-- Prevent changing task creator/owner after insert
create or replace function public.tasks_prevent_owner_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'task user_id (creator) is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_prevent_owner_change_trg on public.tasks;
create trigger tasks_prevent_owner_change_trg
  before update of user_id
  on public.tasks
  for each row
  execute function public.tasks_prevent_owner_change();

-- -----------------------------------------------------------------------------
-- 3) Tasks RLS
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
      or (
        category_id is not null
        and not public.task_category_is_personal(category_id)
        and public.user_can_use_category(category_id)
      )
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
      or (
        category_id is not null
        and not public.task_category_is_personal(category_id)
        and public.user_can_use_category(category_id)
      )
    )
  )
  with check (
    public.is_app_allowed()
    and (
      user_id = auth.uid()
      or (
        category_id is not null
        and not public.task_category_is_personal(category_id)
        and public.user_can_use_category(category_id)
      )
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
        and category_id is not null
        and not public.task_category_is_personal(category_id)
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 4) task_labels — follow parent task access/mutate
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'task_labels'
  loop
    execute format('drop policy if exists %I on public.task_labels', r.policyname);
  end loop;
end;
$$;

create policy "Users select labels on accessible tasks"
  on public.task_labels for select to authenticated
  using (public.user_can_access_task(task_id));

create policy "Users insert labels on mutable tasks"
  on public.task_labels for insert to authenticated
  with check (public.user_can_mutate_task(task_id));

create policy "Users update labels on mutable tasks"
  on public.task_labels for update to authenticated
  using (public.user_can_mutate_task(task_id))
  with check (public.user_can_mutate_task(task_id));

create policy "Users delete labels on mutable tasks"
  on public.task_labels for delete to authenticated
  using (public.user_can_mutate_task(task_id));

-- -----------------------------------------------------------------------------
-- 5) task_due_date_changes
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  if to_regclass('public.task_due_date_changes') is null then
    return;
  end if;

  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'task_due_date_changes'
  loop
    execute format(
      'drop policy if exists %I on public.task_due_date_changes',
      r.policyname
    );
  end loop;

  execute $pol$
    create policy "Users select due date changes on accessible tasks"
      on public.task_due_date_changes for select to authenticated
      using (public.user_can_access_task(task_id))
  $pol$;

  execute $pol$
    create policy "Users insert due date changes on mutable tasks"
      on public.task_due_date_changes for insert to authenticated
      with check (
        user_id = auth.uid()
        and public.user_can_mutate_task(task_id)
      )
  $pol$;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6) task_subtasks — follow parent task (row user_id = actor on insert)
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'task_subtasks'
  loop
    execute format('drop policy if exists %I on public.task_subtasks', r.policyname);
  end loop;
end;
$$;

create policy "Users select subtasks on accessible tasks"
  on public.task_subtasks for select to authenticated
  using (public.user_can_access_task(task_id));

create policy "Users insert subtasks on mutable tasks"
  on public.task_subtasks for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.user_can_mutate_task(task_id)
  );

create policy "Users update subtasks on mutable tasks"
  on public.task_subtasks for update to authenticated
  using (public.user_can_mutate_task(task_id))
  with check (public.user_can_mutate_task(task_id));

create policy "Users delete subtasks on mutable tasks"
  on public.task_subtasks for delete to authenticated
  using (public.user_can_mutate_task(task_id));

-- -----------------------------------------------------------------------------
-- 7) complete_task_with_recurrence — mutate access; spawn keeps parent.user_id
-- -----------------------------------------------------------------------------
create or replace function public.complete_task_with_recurrence(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_existing_child_id uuid;
  v_next_due timestamptz;
  v_next_reminder_at timestamptz;
  v_next_reminder_mode text;
  v_next_reminder_offset integer;
  v_next_id uuid;
  v_delta interval;
  v_owner uuid;
begin
  if v_uid is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_authenticated'
    );
  end if;

  if not public.is_app_allowed() then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_allowed'
    );
  end if;

  if not public.user_can_mutate_task(p_task_id) then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found'
    );
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found'
    );
  end if;

  v_owner := v_task.user_id;

  if v_task.completed then
    select id
    into v_existing_child_id
    from public.tasks
    where spawned_from_task_id = p_task_id
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'already_completed', true,
      'next_task_id', v_existing_child_id,
      'recurrence', v_task.recurrence,
      'due_at', v_task.due_at
    );
  end if;

  if v_task.recurrence = 'none' or v_task.due_at is null then
    update public.tasks
    set completed = true
    where id = p_task_id;

    return jsonb_build_object(
      'ok', true,
      'already_completed', false,
      'next_task_id', null,
      'recurrence', v_task.recurrence,
      'due_at', v_task.due_at
    );
  end if;

  select id
  into v_existing_child_id
  from public.tasks
  where spawned_from_task_id = p_task_id
  limit 1;

  if v_existing_child_id is not null then
    update public.tasks
    set completed = true
    where id = p_task_id;

    return jsonb_build_object(
      'ok', true,
      'already_completed', false,
      'next_task_id', v_existing_child_id,
      'recurrence', v_task.recurrence,
      'due_at', v_task.due_at,
      'duplicate_prevented', true
    );
  end if;

  v_next_due := public.task_next_due_at(v_task.due_at, v_task.recurrence);

  if v_next_due is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'could_not_compute_next_due',
      'recurrence', v_task.recurrence,
      'due_at', v_task.due_at
    );
  end if;

  v_next_reminder_at := null;
  v_next_reminder_mode := null;
  v_next_reminder_offset := null;

  if v_task.reminder_mode = 'relative_due'
     and v_task.reminder_offset_minutes is not null then
    v_next_reminder_mode := 'relative_due';
    v_next_reminder_offset := v_task.reminder_offset_minutes;
    v_next_reminder_at :=
      v_next_due - make_interval(mins => v_task.reminder_offset_minutes);
  elsif v_task.reminder_mode = 'custom' and v_task.reminder_at is not null then
    v_delta := v_next_due - v_task.due_at;
    v_next_reminder_at := v_task.reminder_at + v_delta;
    if v_next_reminder_at is not null then
      v_next_reminder_mode := 'custom';
      v_next_reminder_offset := null;
    end if;
  end if;

  begin
    insert into public.tasks (
      user_id,
      title,
      description,
      due_at,
      completed,
      category_id,
      priority,
      recurrence,
      spawned_from_task_id,
      reminder_at,
      reminder_mode,
      reminder_offset_minutes
    )
    values (
      v_owner,
      v_task.title,
      v_task.description,
      v_next_due,
      false,
      v_task.category_id,
      coalesce(v_task.priority, 'medium'),
      v_task.recurrence,
      p_task_id,
      v_next_reminder_at,
      v_next_reminder_mode,
      v_next_reminder_offset
    )
    returning id into v_next_id;
  exception
    when unique_violation then
      select id
      into v_next_id
      from public.tasks
      where spawned_from_task_id = p_task_id
      limit 1;

      if v_next_id is null then
        raise exception 'unique_violation_without_child for task %', p_task_id;
      end if;
    when others then
      raise exception 'spawn_insert_failed: %', sqlerrm;
  end;

  begin
    insert into public.task_labels (task_id, label_id)
    select v_next_id, tl.label_id
    from public.task_labels tl
    where tl.task_id = p_task_id
    on conflict do nothing;
  exception
    when others then
      raise exception 'label_copy_failed: %', sqlerrm;
  end;

  begin
    insert into public.task_subtasks (
      task_id,
      user_id,
      title,
      completed,
      sort_order
    )
    select
      v_next_id,
      v_owner,
      ts.title,
      false,
      ts.sort_order
    from public.task_subtasks ts
    where ts.task_id = p_task_id
    order by ts.sort_order, ts.created_at;
  exception
    when others then
      raise exception 'subtask_copy_failed: %', sqlerrm;
  end;

  update public.tasks
  set completed = true
  where id = p_task_id;

  return jsonb_build_object(
    'ok', true,
    'already_completed', false,
    'next_task_id', v_next_id,
    'recurrence', v_task.recurrence,
    'due_at', v_task.due_at,
    'next_due_at', v_next_due
  );
end;
$$;

revoke all on function public.complete_task_with_recurrence(uuid) from public;
grant execute on function public.complete_task_with_recurrence(uuid) to authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
