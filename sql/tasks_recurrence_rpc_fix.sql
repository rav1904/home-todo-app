-- Fix: make complete_task_with_recurrence reliable.
-- Run in Supabase SQL editor after sql/tasks_recurrence.sql.
--
-- Changes vs original Phase A RPC:
-- 1. SECURITY DEFINER + ownership checks (auth.uid()) so child INSERT / label /
--    subtask copy cannot be blocked by RLS edge cases while still owner-only.
-- 2. Spawn the next occurrence BEFORE marking completed so a failed spawn never
--    leaves a completed parent without a child.
-- 3. Reminder columns on the child always satisfy tasks_reminder_consistency_check.
-- 4. Recurring tasks with a null next due return ok=false (do not silently complete).
-- 5. Unique-violation without a readable child returns ok=false.
-- 6. Label/subtask copy failures raise (full transaction rollback).

BEGIN;

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
begin
  if v_uid is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_authenticated'
    );
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id
    and user_id = v_uid
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found'
    );
  end if;

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

  -- Non-recurring or missing due: complete only.
  if v_task.recurrence = 'none' or v_task.due_at is null then
    update public.tasks
    set completed = true
    where id = p_task_id
      and user_id = v_uid;

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
    where id = p_task_id
      and user_id = v_uid;

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

  -- Keep reminder columns consistent with tasks_reminder_consistency_check.
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
      v_uid,
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
      v_uid,
      ts.title,
      false,
      ts.sort_order
    from public.task_subtasks ts
    where ts.task_id = p_task_id
      and ts.user_id = v_uid;
  exception
    when others then
      raise exception 'subtask_copy_failed: %', sqlerrm;
  end;

  update public.tasks
  set completed = true
  where id = p_task_id
    and user_id = v_uid;

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
