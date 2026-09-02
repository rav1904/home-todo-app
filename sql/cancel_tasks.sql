-- Run in Supabase SQL editor.
-- Cancel tasks v1: soft-cancel without completing or deleting.
-- Safe to re-run: uses IF NOT EXISTS / DROP CONSTRAINT IF EXISTS / DROP INDEX IF EXISTS.
-- No new tables. No RLS policy changes (existing tasks UPDATE covers these columns).
--
-- Columns:
--   cancelled_at  — when the task was cancelled (NULL = not cancelled)
--   cancelled_by  — auth.users id who cancelled
--
-- Semantics (enforced in app; partial checks in DB):
--   Open = completed = false AND cancelled_at IS NULL
--   Cancelled ≠ completed (do not flip completed)
--   Cancel must NOT call complete_task_with_recurrence (no spawn)
--   Mutators who can UPDATE a task can cancel/restore (owner or shared workspace member)

BEGIN;

alter table public.tasks
  add column if not exists cancelled_at timestamptz;

alter table public.tasks
  add column if not exists cancelled_by uuid references auth.users (id) on delete set null;

comment on column public.tasks.cancelled_at is
  'When the task was cancelled. Null = active (not cancelled). Cancelled tasks stay in history and are hidden from default Open views. Not the same as completed.';

comment on column public.tasks.cancelled_by is
  'auth.users id of the user who cancelled the task. Null when not cancelled.';

-- cancelled_by must be set together with cancelled_at.
alter table public.tasks
  drop constraint if exists tasks_cancelled_consistency_check;

alter table public.tasks
  add constraint tasks_cancelled_consistency_check
  check (
    (cancelled_at is null and cancelled_by is null)
    or (cancelled_at is not null and cancelled_by is not null)
  );

-- Cancelled tasks must not also be marked completed (v1: distinct states).
alter table public.tasks
  drop constraint if exists tasks_cancelled_not_completed_check;

alter table public.tasks
  add constraint tasks_cancelled_not_completed_check
  check (
    cancelled_at is null
    or completed = false
  );

-- Speeds filtering open (non-completed, non-cancelled) tasks.
create index if not exists tasks_open_active_idx
  on public.tasks (user_id, created_at desc)
  where completed = false
    and cancelled_at is null;

-- Refresh active-reminder partial index to exclude cancelled tasks.
drop index if exists public.tasks_user_id_reminder_at_active_idx;

create index if not exists tasks_user_id_reminder_at_active_idx
  on public.tasks (user_id, reminder_at)
  where reminder_at is not null
    and completed = false
    and cancelled_at is null;

COMMIT;
