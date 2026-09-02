-- Documentation reference for the home-todo-app schema.
-- NOT a full migration to run blindly against production.
-- Authoritative apply scripts (when present) live under sql/.
-- Last updated: 2026-09-02
--
-- Tables: tasks, categories, labels, task_labels, label_categories,
--         user_category_access, task_due_date_changes, task_subtasks,
--         app_allowed_users, access_requests
-- Reminders v1: tasks.reminder_at + reminder_mode + reminder_offset_minutes
--   (sql/tasks_reminder_at.sql)
-- Priority v1: tasks.priority (sql/tasks_priority.sql)
-- Recurrence v1: tasks.recurrence + spawned_from_task_id (sql/tasks_recurrence.sql)
-- Cancel v1: tasks.cancelled_at + cancelled_by (sql/cancel_tasks.sql)
-- Category access: Personal per user + global grants (sql/categories_personal_and_access.sql)
-- App access: allowlist + requests (sql/app_access_control.sql)
-- Display names: admin override on allowlist (sql/user_display_name_overrides.sql)
-- Shared workspaces: global categories share tasks with members (sql/shared_workspace_tasks.sql)

-- =============================================================================
-- categories (global admin tree + per-user Personal)
-- =============================================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete cascade,
  name text not null,
  colour text not null,
  icon_name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  scope text not null default 'global'
    check (scope in ('global', 'personal')),
  user_id uuid references auth.users (id) on delete cascade,
  admin_note text, -- optional admin clarity for shared workspaces
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- global: user_id is null; name may not be 'Personal'; top-level = shared workspace
  -- personal: user_id = owner; parent_id null; name = 'Personal'; one per user
);

-- Partial unique indexes (see sql/categories_personal_and_access.sql):
--   categories_global_main_name_uidx  (lower(name)) where scope=global and parent_id is null
--   categories_global_sub_name_uidx   (parent_id, lower(name)) where scope=global and parent_id is not null
--   categories_personal_user_uidx     (user_id) where scope=personal

-- Provisioning:
--   ensure_personal_category_for_user(uuid) — internal SECURITY DEFINER
--   ensure_my_personal_category() — authenticated + is_app_allowed() only
--   auth.users AFTER INSERT trigger removed by sql/app_access_control.sql
--   Personal is created on approval / first allowed dashboard use

-- =============================================================================
-- app_allowed_users + access_requests (app membership)
-- Source of truth for apply: sql/app_access_control.sql
-- Display name override: sql/user_display_name_overrides.sql
-- =============================================================================

create table if not exists public.app_allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text not null, -- always lowercased; unique
  user_id uuid references auth.users (id) on delete set null,
  status text not null check (status in ('approved', 'revoked')),
  source text not null check (source in ('manual', 'request', 'bootstrap')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  display_name_override text -- admin-only; null = Google/Auth/email fallback; max 40 chars
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null, -- always lowercased
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  message text, -- optional; max 1000 chars
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

-- Helpers: is_app_allowed(), submit_access_request, admin_approve/reject/add/revoke/reapprove,
--          admin_set_display_name_override (sql/user_display_name_overrides.sql)
-- Admin email is always allowed via is_app_admin() even if allowlist row missing/revoked.
-- Display name override is admin-write only; blank saves as null.

-- =============================================================================
-- user_category_access (admin grants of global top-level categories)
-- =============================================================================

create table if not exists public.user_category_access (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

-- Trigger: category_id must be scope=global and parent_id is null.
-- Personal access is NOT stored here.
-- Grants = shared workspace membership for that top-level category.

-- Helpers (sql/shared_workspace_tasks.sql; display names also sql/user_display_name_overrides.sql):
--   user_can_access_task / user_can_mutate_task / user_can_delete_task
--   task_category_is_personal, get_task_creator_profiles (override → Auth name → email)
--   complete_task_with_recurrence keeps parent.user_id on spawn

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
  recurrence text not null default 'none', -- none | weekly | fortnightly | monthly | quarterly | semi_annual | annual
  spawned_from_task_id uuid references public.tasks (id) on delete set null,
  completed boolean not null default false,
  cancelled_at timestamptz, -- null = not cancelled; soft-cancel (not completed)
  cancelled_by uuid references auth.users (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Reminder checks (see sql/tasks_reminder_at.sql):
--   tasks_reminder_mode_check
--   tasks_reminder_offset_minutes_check
--   tasks_reminder_consistency_check
-- Partial index for active reminders (open tasks with reminder_at set):
--   tasks_user_id_reminder_at_active_idx ON (user_id, reminder_at)
--   WHERE reminder_at IS NOT NULL AND completed = false AND cancelled_at IS NULL
--
-- Cancel checks (see sql/cancel_tasks.sql):
--   tasks_cancelled_consistency_check (cancelled_at/by both null or both set)
--   tasks_cancelled_not_completed_check (cancelled implies completed = false)
-- Open-active index: tasks_open_active_idx WHERE completed = false AND cancelled_at IS NULL
-- Open = completed = false AND cancelled_at IS NULL. Cancel does not spawn recurrence.

-- App: custom reminder is independent of due_at.
-- App: relative_due recalculates reminder_at when due_at changes; clears if due_at cleared.

-- Priority check (see sql/tasks_priority.sql):
--   tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))

-- Recurrence (see sql/tasks_recurrence.sql):
--   tasks_recurrence_check
--   tasks_recurrence_requires_due_at_check (recurrence = 'none' OR due_at IS NOT NULL)
--   UNIQUE (spawned_from_task_id) WHERE spawned_from_task_id IS NOT NULL
--   RPC: complete_task_with_recurrence(task_id) — complete + spawn next occurrence

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
--   - No category / Personal category → show personal labels only
--   - Main global category → globals linked to that main
--   - Subcategory → globals linked to sub OR parent main
--   - Personal labels always available
--   - Existing task_labels rows are not auto-removed when category changes
-- label_categories must not link to Personal categories
--   (sql/categories_personal_and_access.sql)

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
