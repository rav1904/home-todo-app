-- Run in Supabase SQL editor.
-- Optional Support person (tasks.support_assigned_to) alongside Assigned to.
-- Safe to re-run: IF NOT EXISTS / DROP CONSTRAINT IF EXISTS / DROP TRIGGER IF EXISTS / CREATE OR REPLACE.
--
-- Rules:
--   - user_id remains the immutable creator (do not rename)
--   - assigned_to remains the main assignee (do not rename)
--   - support_assigned_to is optional; same eligibility as assigned_to
--   - Assigned to and Support cannot be the same person
--   - Maximum two assignees: Assigned to + Support (no unlimited multi-assignee)
--   - support_assigned_to never grants visibility (existing task SELECT unchanged)
--   - Recurrence copies support_assigned_to when eligible; otherwise null
--   - If copied Support would equal Assigned to, Support is cleared

BEGIN;

alter table public.tasks
  add column if not exists support_assigned_to uuid references auth.users (id) on delete set null;

comment on column public.tasks.support_assigned_to is
  'Optional Support person. Null = none. Same eligibility as assigned_to. Must differ from assigned_to. Does not grant task visibility.';

create index if not exists tasks_support_assigned_to_idx
  on public.tasks (support_assigned_to)
  where support_assigned_to is not null;

alter table public.tasks
  drop constraint if exists tasks_support_distinct_from_assigned;

alter table public.tasks
  add constraint tasks_support_distinct_from_assigned
  check (
    support_assigned_to is null
    or assigned_to is distinct from support_assigned_to
  );

-- Eligibility for assigned_to and support_assigned_to (same rules).
-- Also rejects Assigned to === Support.
create or replace function public.tasks_enforce_assigned_to()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.support_assigned_to is not null
     and new.assigned_to is not null
     and new.support_assigned_to = new.assigned_to then
    raise exception 'Support must be different from Assigned to.';
  end if;

  if new.assigned_to is not null then
    if not public.user_is_approved_app_user(new.assigned_to) then
      raise exception 'Assignee is not an approved app user';
    end if;

    if new.category_id is null
       or public.task_category_is_personal(new.category_id) then
      if new.assigned_to is distinct from new.user_id then
        raise exception 'Personal and private tasks can only be assigned to the creator';
      end if;
    elsif not public.user_can_assign_task_to_category(new.category_id, new.assigned_to) then
      raise exception 'Assignee does not have access to this workspace';
    end if;
  end if;

  if new.support_assigned_to is not null then
    if not public.user_is_approved_app_user(new.support_assigned_to) then
      raise exception 'Support is not an approved app user';
    end if;

    if new.category_id is null
       or public.task_category_is_personal(new.category_id) then
      if new.support_assigned_to is distinct from new.user_id then
        raise exception 'Personal and private tasks can only be assigned to the creator';
      end if;
    elsif not public.user_can_assign_task_to_category(new.category_id, new.support_assigned_to) then
      raise exception 'Support does not have access to this workspace';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_enforce_assigned_to_trg on public.tasks;
create trigger tasks_enforce_assigned_to_trg
  before insert or update of assigned_to, support_assigned_to, category_id, user_id
  on public.tasks
  for each row
  execute function public.tasks_enforce_assigned_to();

-- Recurrence: keep creator (user_id); copy assigned_to / support_assigned_to
-- only if still eligible. Clear Support rather than failing if ineligible
-- or if it would duplicate Assigned to.
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
  v_support uuid;
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

  v_support := public.resolved_task_assigned_to(
    v_task.category_id,
    v_owner,
    v_task.support_assigned_to
  );

  if v_support is not null
     and v_assigned is not null
     and v_support = v_assigned then
    v_support := null;
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
      reminder_offset_minutes,
      assigned_to,
      support_assigned_to
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
      v_assigned,
      v_support
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
