-- Documentation reference for the home-todo-app schema.
-- NOT a full migration to run blindly against production.
-- Authoritative apply scripts (when present) live under sql/.
-- Last updated: 2026-08-08
--
-- Tables: tasks, categories, labels, task_labels, label_categories,
--         task_due_date_changes, task_subtasks
-- Reminders v1: tasks.reminder_at + reminder_mode + reminder_offset_minutes
--   (sql/tasks_reminder_at.sql)
-- Priority v1: tasks.priority (sql/tasks_priority.sql)

-- =============================================================================
-- categories (admin-managed tree)
-- =============================================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete cascade,
  name text not null,
  colour text not null,
  icon_name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique names per level are enforced with partial unique indexes in Supabase
-- (main categories vs siblings under the same parent).

-- =============================================================================
-- tasks
-- =============================================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  reminder_at timestamptz, -- resolved reminder datetime; null = none
  reminder_mode text, -- null | custom | relative_due
  reminder_offset_minutes integer, -- relative_due only: 60 | 1440 | 10080
  priority text not null default 'medium', -- low | medium | high | urgent
  completed boolean not null default false,
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Reminder checks (see sql/tasks_reminder_at.sql):
--   tasks_reminder_mode_check
--   tasks_reminder_offset_minutes_check
--   tasks_reminder_consistency_check
-- Partial index for active reminders (open tasks with reminder_at set):
--   tasks_user_id_reminder_at_active_idx ON (user_id, reminder_at)
--   WHERE reminder_at IS NOT NULL AND completed = false

-- App: custom reminder is independent of due_at.
-- App: relative_due recalculates reminder_at when due_at changes; clears if due_at cleared.

-- Priority check (see sql/tasks_priority.sql):
--   tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))

-- =============================================================================
-- labels (hybrid: global + personal)
-- =============================================================================

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  colour text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  scope text not null default 'global'
    check (scope in ('global', 'personal')),
  created_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- App/DB constraints:
  --   global: created_by is null; unique name among globals
  --   personal: created_by = owner; unique name per user among personal
);

-- =============================================================================
-- task_labels (task ↔ label junction)
-- =============================================================================

create table if not exists public.task_labels (
  task_id uuid not null references public.tasks (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (task_id, label_id)
);

-- Attachability (app + RLS): active global, or own active personal.

-- =============================================================================
-- label_categories (global label ↔ category/subcategory links)
-- Source of truth for apply: sql/label_categories.sql
-- =============================================================================

create table if not exists public.label_categories (
  label_id uuid not null references public.labels (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (label_id, category_id)
);

create index if not exists label_categories_category_id_idx
  on public.label_categories (category_id);

-- Trigger label_categories_require_global_label:
--   BEFORE INSERT OR UPDATE OF label_id → labels.scope must be 'global'.

-- App picker rules (Phase C; no extra DB columns):
--   - No category selected → show personal labels only
--   - Main category → globals linked to that main
--   - Subcategory → globals linked to sub OR parent main
--   - Personal labels always available
--   - Existing task_labels rows are not auto-removed when category changes

-- =============================================================================
-- task_due_date_changes
-- =============================================================================

create table if not exists public.task_due_date_changes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  previous_due_at timestamptz,
  new_due_at timestamptz,
  change_direction text not null
    check (change_direction in (
      'set',
      'cleared',
      'moved_earlier',
      'moved_later',
      'changed'
    )),
  changed_at timestamptz not null default now()
);

-- =============================================================================
-- task_subtasks
-- Source of truth for apply: sql/task_subtasks.sql
-- =============================================================================

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_subtasks_title_not_blank check (length(trim(title)) > 0)
);

create index if not exists task_subtasks_task_id_sort_order_idx
  on public.task_subtasks (task_id, sort_order);

create index if not exists task_subtasks_user_id_idx
  on public.task_subtasks (user_id);
