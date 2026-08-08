-- Run in Supabase SQL editor.
-- Reminders v1: optional reminder on tasks (exact custom OR relative to due_at).
-- Safe to re-run: uses IF NOT EXISTS / DROP CONSTRAINT IF EXISTS.
-- No new tables. No RLS policy changes (existing tasks RLS covers these columns).
--
-- Columns:
--   reminder_at              — resolved datetime used by dashboard/cards (NULL = no active reminder)
--   reminder_mode            — NULL | custom | relative_due
--   reminder_offset_minutes  — for relative_due: 60 | 1440 | 10080
--
-- App rules (not enforced fully in DB):
--   custom: reminder_at set by user; independent of due_at
--   relative_due: reminder_at = due_at - offset; requires due_at; recalculate when due_at changes
--   Active reminder in UI: reminder_at IS NOT NULL AND completed = false

BEGIN;

alter table public.tasks
  add column if not exists reminder_at timestamptz;

alter table public.tasks
  add column if not exists reminder_mode text;

alter table public.tasks
  add column if not exists reminder_offset_minutes integer;

comment on column public.tasks.reminder_at is
  'Resolved in-app reminder time. Null = no reminder. Used for overdue/upcoming lists. Completed tasks are not treated as active reminders in the app.';

comment on column public.tasks.reminder_mode is
  'NULL = no reminder; custom = exact reminder_at; relative_due = reminder_at derived from due_at minus reminder_offset_minutes.';

comment on column public.tasks.reminder_offset_minutes is
  'Minutes before due_at when reminder_mode = relative_due. Allowed: 60 (1h), 1440 (1d), 10080 (1w). Null otherwise.';

-- Backfill rows that already have reminder_at from the earlier custom-only UI.
update public.tasks
set
  reminder_mode = 'custom',
  reminder_offset_minutes = null
where reminder_at is not null
  and reminder_mode is null;

-- Clear inconsistent partial state if any.
update public.tasks
set
  reminder_at = null,
  reminder_mode = null,
  reminder_offset_minutes = null
where reminder_mode is null
  and (reminder_at is not null or reminder_offset_minutes is not null);

alter table public.tasks
  drop constraint if exists tasks_reminder_mode_check;

alter table public.tasks
  add constraint tasks_reminder_mode_check
  check (
    reminder_mode is null
    or reminder_mode in ('custom', 'relative_due')
  );

alter table public.tasks
  drop constraint if exists tasks_reminder_offset_minutes_check;

alter table public.tasks
  add constraint tasks_reminder_offset_minutes_check
  check (
    reminder_offset_minutes is null
    or reminder_offset_minutes in (60, 1440, 10080)
  );

alter table public.tasks
  drop constraint if exists tasks_reminder_consistency_check;

alter table public.tasks
  add constraint tasks_reminder_consistency_check
  check (
    (
      reminder_mode is null
      and reminder_at is null
      and reminder_offset_minutes is null
    )
    or (
      reminder_mode = 'custom'
      and reminder_at is not null
      and reminder_offset_minutes is null
    )
    or (
      reminder_mode = 'relative_due'
      and reminder_at is not null
      and reminder_offset_minutes is not null
    )
  );

-- Speeds owner queries for open tasks with a reminder set.
create index if not exists tasks_user_id_reminder_at_active_idx
  on public.tasks (user_id, reminder_at)
  where reminder_at is not null
    and completed = false;

COMMIT;
