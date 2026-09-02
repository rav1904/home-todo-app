-- Run in Supabase SQL editor.
-- Task author (existing tasks.user_id) + optional assignee (tasks.assigned_to).
-- Safe to re-run: IF NOT EXISTS / DROP TRIGGER IF EXISTS / CREATE OR REPLACE.
--
-- Rules:
--   - user_id remains the immutable creator/author
--   - assigned_to is optional
--   - Personal / null-category: only null or the creator
--   - Shared workspace: only approved users with access to that workspace
--   - assigned_to never grants visibility (existing task SELECT unchanged)
--   - Recurrence copies assigned_to only when still eligible
--
-- Display names for assignee lists reuse get_task_creator_profiles /
-- get_assignable_users_for_category (override → Auth name → email).

BEGIN;

alter table public.tasks
  add column if not exists assigned_to uuid references auth.users (id) on delete set null;

comment on column public.tasks.assigned_to is
  'Optional assignee. Null = unassigned. Does not grant task visibility. Personal/null-category: creator only. Shared: workspace members (incl. admin).';

create index if not exists tasks_assigned_to_idx
  on public.tasks (assigned_to)
  where assigned_to is not null;

-- Approved platform user (allowlist approved, or hardcoded admin email).
create or replace function public.user_is_approved_app_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    p_user_id is not null
    and (
      exists (
        select 1
        from auth.users u
        where u.id = p_user_id
          and lower(u.email) = 'nirav@slbenfica.co.uk'
      )
      or exists (
        select 1
        from public.app_allowed_users a
        join auth.users u on u.id = p_user_id
        where a.status = 'approved'
          and (
            a.user_id = p_user_id
            or a.email = lower(u.email)
          )
      )
    ),
    false
  );
$$;

revoke all on function public.user_is_approved_app_user(uuid) from public;
grant execute on function public.user_is_approved_app_user(uuid) to authenticated;

-- Eligibility for a category/workspace (not the current JWT user).
-- Null assignee is always allowed. Null category is false here; the trigger
-- additionally allows assigned_to = creator for private/legacy tasks.
create or replace function public.user_can_assign_task_to_category(
  p_category_id uuid,
  p_assignee_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_scope text;
  v_owner uuid;
  v_parent_id uuid;
  v_active boolean;
  v_top uuid;
  v_email text;
begin
  if p_assignee_user_id is null then
    return true;
  end if;

  if not public.user_is_approved_app_user(p_assignee_user_id) then
    return false;
  end if;

  if p_category_id is null then
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
    return v_owner = p_assignee_user_id;
  end if;

  select lower(u.email)
  into v_email
  from auth.users u
  where u.id = p_assignee_user_id;

  if v_email = 'nirav@slbenfica.co.uk' then
    return true;
  end if;

  if not v_active then
    return false;
  end if;

  v_top := coalesce(v_parent_id, p_category_id);

  return exists (
    select 1
    from public.user_category_access g
    where g.user_id = p_assignee_user_id
      and g.category_id = v_top
  );
end;
$$;

revoke all on function public.user_can_assign_task_to_category(uuid, uuid) from public;
grant execute on function public.user_can_assign_task_to_category(uuid, uuid) to authenticated;

create or replace function public.resolved_task_assigned_to(
  p_category_id uuid,
  p_creator_id uuid,
  p_assigned_to uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if p_assigned_to is null then
    return null;
  end if;

  if p_category_id is null or public.task_category_is_personal(p_category_id) then
    if p_assigned_to = p_creator_id
       and public.user_is_approved_app_user(p_assigned_to) then
      return p_assigned_to;
    end if;
    return null;
  end if;

  if public.user_can_assign_task_to_category(p_category_id, p_assigned_to) then
    return p_assigned_to;
  end if;

  return null;
end;
$$;

revoke all on function public.resolved_task_assigned_to(uuid, uuid, uuid) from public;
grant execute on function public.resolved_task_assigned_to(uuid, uuid, uuid) to authenticated;

create or replace function public.tasks_enforce_assigned_to()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.assigned_to is null then
    return new;
  end if;

  if not public.user_is_approved_app_user(new.assigned_to) then
    raise exception 'Assignee is not an approved app user';
  end if;

  if new.category_id is null
     or public.task_category_is_personal(new.category_id) then
    if new.assigned_to is distinct from new.user_id then
      raise exception 'Personal and private tasks can only be assigned to the creator';
    end if;
    return new;
  end if;

  if not public.user_can_assign_task_to_category(new.category_id, new.assigned_to) then
    raise exception 'Assignee does not have access to this workspace';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_enforce_assigned_to_trg on public.tasks;
create trigger tasks_enforce_assigned_to_trg
  before insert or update of assigned_to, category_id, user_id
  on public.tasks
  for each row
  execute function public.tasks_enforce_assigned_to();

-- Eligible assignees for the current user to pick in the form.
-- Does not expose Personal tasks or grants the caller cannot already use.
create or replace function public.get_assignable_users_for_category(p_category_id uuid)
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
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text;
  v_owner uuid;
  v_parent_id uuid;
  v_top uuid;
begin
  if v_uid is null or not public.is_app_allowed() then
    return;
  end if;

  if p_category_id is null then
    return query
    select
      u.id,
      u.email::text,
      coalesce(
        nullif(trim(a.display_name_override), ''),
        nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
        nullif(trim(u.email), ''),
        'User'
      )::text,
      coalesce(
        nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), ''),
        nullif(trim(u.raw_user_meta_data ->> 'picture'), '')
      )::text
    from auth.users u
    left join public.app_allowed_users a
      on a.email = lower(coalesce(u.email, ''))
    where u.id = v_uid;
    return;
  end if;

  select c.scope, c.user_id, c.parent_id
  into v_scope, v_owner, v_parent_id
  from public.categories c
  where c.id = p_category_id;

  if v_scope is null then
    return;
  end if;

  if v_scope = 'personal' then
    if v_owner is distinct from v_uid then
      return;
    end if;

    return query
    select
      u.id,
      u.email::text,
      coalesce(
        nullif(trim(a.display_name_override), ''),
        nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
        nullif(trim(u.email), ''),
        'User'
      )::text,
      coalesce(
        nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), ''),
        nullif(trim(u.raw_user_meta_data ->> 'picture'), '')
      )::text
    from auth.users u
    left join public.app_allowed_users a
      on a.email = lower(coalesce(u.email, ''))
    where u.id = v_uid;
    return;
  end if;

  if not public.user_can_use_category(p_category_id) then
    return;
  end if;

  v_top := coalesce(v_parent_id, p_category_id);

  return query
  select
    u.id,
    u.email::text,
    coalesce(
      nullif(trim(a.display_name_override), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      nullif(trim(u.email), ''),
      'User'
    )::text,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'picture'), '')
    )::text
  from auth.users u
  left join public.app_allowed_users a
    on a.email = lower(coalesce(u.email, ''))
  where public.user_can_assign_task_to_category(p_category_id, u.id)
    and (
      exists (
        select 1
        from public.user_category_access g
        where g.user_id = u.id
          and g.category_id = v_top
      )
      or lower(u.email) = 'nirav@slbenfica.co.uk'
    )
  order by 3, 2;
end;
$$;

revoke all on function public.get_assignable_users_for_category(uuid) from public;
grant execute on function public.get_assignable_users_for_category(uuid) to authenticated;

-- Recurrence: keep creator (user_id); copy assigned_to only if still eligible.
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
  v_assigned uuid;
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

  v_assigned := public.resolved_task_assigned_to(
    v_task.category_id,
    v_owner,
    v_task.assigned_to
  );

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
      reminder_offset_minutes,
      assigned_to
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
      v_next_reminder_offset,
      v_assigned
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
