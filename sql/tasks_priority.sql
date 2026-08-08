-- Run in Supabase SQL editor.
-- Task Priority v1 Phase A: required priority on tasks.
-- Safe to re-run: uses IF NOT EXISTS / DROP CONSTRAINT IF EXISTS.
-- No new tables. No RLS policy changes (existing tasks RLS covers the column).
-- App UI (forms, badge, sort) comes in a later phase.
--
-- Values: low | medium | high | urgent
-- Default for new and existing rows: medium

BEGIN;

alter table public.tasks
  add column if not exists priority text;

-- Backfill any existing nulls before NOT NULL / default.
update public.tasks
set priority = 'medium'
where priority is null;

alter table public.tasks
  alter column priority set default 'medium';

alter table public.tasks
  alter column priority set not null;

comment on column public.tasks.priority is
  'Task priority: low | medium | high | urgent. Default medium. Owner-only via tasks RLS.';

alter table public.tasks
  drop constraint if exists tasks_priority_check;

alter table public.tasks
  add constraint tasks_priority_check
  check (priority in ('low', 'medium', 'high', 'urgent'));

COMMIT;
