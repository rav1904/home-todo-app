-- Run in Supabase SQL editor.
-- Recurring Tasks v1 Phase A: schema + atomic complete/spawn RPC.
-- Safe to re-run: IF NOT EXISTS / DROP IF EXISTS patterns.
-- No new tables. No RLS policy changes (task columns + SECURITY DEFINER RPC
-- that still requires auth.uid() ownership of the source task).
--
-- Columns:
--   recurrence              — none | weekly | fortnightly | monthly | quarterly | semi_annual | annual
--   spawned_from_task_id    — parent occurrence that created this task (unique when set)
--
-- RPC: public.complete_task_with_recurrence(p_task_id uuid) → jsonb
--   Marks the task completed (owner only via auth.uid()).
--   If recurring + due_at set, inserts one next open occurrence (idempotent).
--   Copies labels and incomplete subtask templates.
-- App UI / form wiring comes in a later phase.

BEGIN;

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column if not exists recurrence text;

alter table public.tasks
  add column if not exists spawned_from_task_id uuid;

update public.tasks
set recurrence = 'none'
where recurrence is null;

alter table public.tasks
  alter column recurrence set default 'none';

alter table public.tasks
  alter column recurrence set not null;

comment on column public.tasks.recurrence is
  'Recurrence: none | weekly | fortnightly | monthly | quarterly | semi_annual | annual. Recurring tasks require due_at (enforced in app + RPC).';

comment on column public.tasks.spawned_from_task_id is
  'When set, this task was created as the next occurrence of the referenced completed task. At most one child per parent (unique index).';

alter table public.tasks
  drop constraint if exists tasks_recurrence_check;

alter table public.tasks
  add constraint tasks_recurrence_check
  check (
    recurrence in (
      'none',
      'weekly',
      'fortnightly',
      'monthly',
      'quarterly',
      'semi_annual',
      'annual'
    )
  );

-- Recurring rows must have a due date.
alter table public.tasks
  drop constraint if exists tasks_recurrence_requires_due_at_check;

alter table public.tasks
  add constraint tasks_recurrence_requires_due_at_check
  check (recurrence = 'none' or due_at is not null);

-- FK for lineage (nullable).
alter table public.tasks
  drop constraint if exists tasks_spawned_from_task_id_fkey;

alter table public.tasks
  add constraint tasks_spawned_from_task_id_fkey
  foreign key (spawned_from_task_id)
  references public.tasks (id)
  on delete set null;

-- At most one next occurrence spawned from a given task.
create unique index if not exists tasks_spawned_from_task_id_uidx
  on public.tasks (spawned_from_task_id)
  where spawned_from_task_id is not null;

create index if not exists tasks_recurrence_idx
  on public.tasks (user_id, recurrence)
  where recurrence <> 'none';

-- ---------------------------------------------------------------------------
-- Next due helper
-- ---------------------------------------------------------------------------

create or replace function public.task_next_due_at(
  p_due_at timestamptz,
  p_recurrence text
)
returns timestamptz
language sql
immutable
as $$
  select case p_recurrence
    when 'weekly' then p_due_at + interval '7 days'
    when 'fortnightly' then p_due_at + interval '14 days'
    when 'monthly' then p_due_at + interval '1 month'
    when 'quarterly' then p_due_at + interval '3 months'
    when 'semi_annual' then p_due_at + interval '6 months'
    when 'annual' then p_due_at + interval '1 year'
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- Complete + spawn (transactional).
-- SECURITY DEFINER + auth.uid() ownership checks so spawn/copy cannot be
-- blocked by RLS edge cases. Prefer sql/tasks_recurrence_rpc_fix.sql if
-- this function was already installed from an older Phase A revision.
-- ---------------------------------------------------------------------------

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

  -- Already completed: idempotent; return any existing child.
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

  -- Child already exists (race / retry).
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

  -- Reminders on the next occurrence (must satisfy tasks_reminder_consistency_check).
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

  -- Spawn first, then mark completed — never leave a completed parent without a child.
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

revoke all on function public.task_next_due_at(timestamptz, text) from public;
grant execute on function public.task_next_due_at(timestamptz, text) to authenticated;

COMMIT;
