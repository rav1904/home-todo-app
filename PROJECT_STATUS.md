# Project Status

Last updated: 2026-08-08

## Current branch

`main`

## Current milestone

**v1.4 — Recurring Tasks v1**

## What is working

### Auth & shell
- Google-only login
- Supabase connection
- Protected dashboard routes
- Sidebar: Overview, Focus, Tasks, Calendar, Settings; Admin link for admin only
- Light / dark / system theme via `next-themes` (browser-local; header `ThemeMenu`)
- Floating quick-add task button (FAB) on dashboard pages (`fixed`, clear of sidebar)

### Tasks (user-facing)
- Add, list, complete, delete tasks
- Edit task (title, description, due date/time, category, labels, completed status)
- Due date/time via `datetime-local` with 5-minute normalisation (`step=300` + round on save)
- Due date change tracking (`task_due_date_changes`) with neutral counts and moved-later nudge (≥3)
- Private user task lists using RLS
- Deep-link edit: `/dashboard/tasks?edit=<taskId>`
- Filters on tasks page: `?category=`, `?label=`, `?q=`, `?status=`, `?sort=`
- Pipeline: category → label → status → search → sort; `?edit=` still injects filtered-out task
- **Reminders** — `reminder_at` + `reminder_mode` + `reminder_offset_minutes`; presets: none / custom / 1h / 1d / 1w before due; relative recalculates with due; overview sections; no email/push
- **Priority** — `low` / `medium` / `high` / `urgent` (default medium); forms + card badge; sort `priority_desc`; calendar chips show high/urgent dot only
- **Focus** — `/dashboard/focus`; open tasks only; exclusive sections (overdue → due today → reminders → high/urgent → up next); full `TaskListItem`
- **Recurrence** — weekly…annual on tasks; complete via RPC spawns next occurrence (labels + subtasks); due required when repeating

### Subtasks / checklist
- **`task_subtasks` table** — per-task checklist owned by task user; RLS by `user_id`
- Read-view checklist on task cards (add, toggle, reorder up/down, delete)
- Immediate save per action; progress indicator on task card
- Wired into tasks page and calendar task modal
- No subtasks on create form (v1)

### Calendar
- Month / week / day / list views with URL params
- Task chips open calendar task modal (read → edit via `TaskListItem`)
- Day grouping by local `due_at`; save/delete refresh calendar
- Category-scoped label picker in edit modal (same rules as tasks page)

### Labels (hybrid)
- **`labels`** — `scope` global | personal; `created_by` for personal; archive via `active`
- **`task_labels`** — junction; attach only active labels (global or own personal)
- **`label_categories`** — links **global** labels to categories/subcategories (Phases A–B)
- **Admin** — `/dashboard/admin/labels` manages **global** labels + category links only
- **Users** — create personal labels from task form or Settings; own personal only
- Task pickers / filters: `active = true` only
- Settings: active + archived personal labels (after RLS fix SQL)
- Soft-archive only (no hard delete in v1)
- Admin and other users cannot see personal labels

### Label picker scoping (Phase C)
- **Personal labels** — always available; not restricted by category
- **No category** — shared/global labels hidden; helper message shown
- **Main category** — active globals linked to that main
- **Subcategory** — active globals linked to the sub **or** its parent main
- Changing category updates available globals; does **not** auto-remove selected labels
- Existing task attachments still display even if no longer “relevant” for the category

### Settings
- `/dashboard/settings` for every signed-in user
- Appearance: System / Light / Dark (reuses `ThemeToggle`)
- Personal labels: create, edit name/colour, archive / reactivate, Cancel on create/edit

### Categories (Phases A–D + per-user access)
- **`categories` table** — global admin-managed tree (main + sub) plus per-user private `Personal` (`scope`, `user_id`)
- **`user_category_access`** — admin grants of global top-level categories; subs inherit; Personal never stored here
- **`tasks.category_id`** — optional; new tasks default to Personal; null kept for legacy uncategorised
- **Admin** — `/dashboard/admin/categories` manages **global** only; Users panel grants global access
- **Task assignment** — main + optional sub dropdowns on add/edit; badge on task card; RLS/trigger enforce allowed categories
- **Task filtering** — URL param `?category=`
- 20 Lucide icons; preset colours + validated hex
- Apply: `sql/categories_personal_and_access.sql`

### Admin (users)
- Admin panel at `/dashboard/admin`
- User list with Google profile metadata + per-user global category access controls
- Admin sub-nav: Users | Categories | Labels
- Admin cannot see other users’ task content, personal labels, or Personal categories
- Admin task UI: own Personal + all global categories

## Privacy / security

- Only `nirav@slbenfica.co.uk` is admin
- `ADMIN_EMAIL` is server-side only
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only
- Service role is used only for Auth Admin user listing and aggregate task counts — not for categories, labels, or task content
- Task RLS: `user_id = auth.uid()`
- Category RLS: own Personal; granted active globals (or all globals for admin); admin mutates global only
- Label RLS: active global readable by all; personal SELECT/UPDATE only for `created_by = auth.uid()` (active + archived); admin manages global only
- `label_categories`: SELECT usable categories only; admin INSERT/DELETE; triggers enforce global label + global category
- Task category trigger: blocks ungranted `category_id`; strict recurrence spawn checks
- Admin does not see task titles, descriptions, due dates, or task lists for other users

## What is not built yet

- Priority filter on Tasks page
- Email / browser push reminders
- Reminder snooze / dismiss state
- Recurrence series edit / delete future / catch-up loops
- Multi-user task assignment / sharing
- Task-level permissions
- Category / label filters on dashboard overview (tasks page only)
- Proper profiles table / role table
- Full Supabase CLI migrations in repo (SQL scripts under `sql/` + docs reference)
- Deployment

## Supabase setup status

| Item | Status |
|------|--------|
| Project linked (`.env.local`) | Done |
| Google OAuth provider | Done |
| Redirect URLs (`/auth/callback`) | Done |
| Email/password auth | Disabled in UI |
| RLS on `tasks` | Verified locally |
| RLS on `categories` | Active readable by users; admin manages all |
| RLS on `labels` / `task_labels` | Hybrid global + personal; see `docs/rls-policies.md` |
| RLS on `label_categories` | Auth SELECT; admin INSERT/DELETE (`sql/label_categories.sql`) |
| RLS on `task_subtasks` | Owner-only (`sql/task_subtasks.sql`) |
| `categories` + `tasks.category_id` | Done (SQL editor) |
| `labels` + `task_labels` + scope/personal | Done (SQL editor) |
| Personal label SELECT includes archived | `sql/labels_personal_select_archived.sql` |
| `label_categories` | `sql/label_categories.sql` (run in SQL editor) |
| `task_due_date_changes` | Done (SQL editor) |
| `task_subtasks` | Done (`sql/task_subtasks.sql`) |
| `tasks.reminder_at` (+ mode/offset) | Done (`sql/tasks_reminder_at.sql`; no new RLS) |
| `tasks.priority` | Done (`sql/tasks_priority.sql`; no new RLS) |
| `tasks.recurrence` (+ spawn RPC) | Done (`sql/tasks_recurrence.sql`) |
| Admin env vars | Done (server-side only) |
| CLI / full migrations in repo | Not set up |

## Database tables created so far

Mostly created in Supabase SQL editor. Repo scripts: `sql/task_subtasks.sql`, `sql/labels_personal_select_archived.sql`, `sql/label_categories.sql`, `sql/tasks_reminder_at.sql`, `sql/tasks_priority.sql`, `sql/tasks_recurrence.sql`, `sql/categories_personal_and_access.sql`. Reference snapshot: `docs/database-schema.sql`.

### `tasks`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → `auth.users` |
| `title` | text | Required |
| `description` | text | Optional |
| `due_at` | timestamptz | Optional |
| `reminder_at` | timestamptz | Resolved reminder time; null = none |
| `reminder_mode` | text | null / `custom` / `relative_due` |
| `reminder_offset_minutes` | int | Relative only: 60 / 1440 / 10080 |
| `priority` | text | `low` / `medium` / `high` / `urgent`; default `medium` (`sql/tasks_priority.sql`) |
| `recurrence` | text | `none` / weekly…annual; default `none` (`sql/tasks_recurrence.sql`) |
| `spawned_from_task_id` | uuid | Nullable FK → parent occurrence; unique when set |
| `completed` | boolean | Default false |
| `category_id` | uuid | Nullable FK → `categories`, ON DELETE SET NULL |
| `created_at` | timestamptz | Default now |

### `categories`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | Primary key |
| `parent_id` | uuid | NULL = main category; FK → `categories` |
| `name` | text | Unique per level (partial indexes) |
| `colour` | text | Preset or validated hex |
| `icon_name` | text | Lucide allowlist |
| `sort_order` | int | Custom order within sibling group |
| `active` | boolean | Archive = false; hidden from users |
| `created_at` / `updated_at` | timestamptz | |

### `labels`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | Primary key |
| `name` | text | Unique per global name / per-user personal name |
| `colour` | text | Preset or validated hex |
| `sort_order` | int | Order within scope group |
| `active` | boolean | Archive = false; hidden from pickers |
| `scope` | text | `global` or `personal` |
| `created_by` | uuid | NULL for global; owner for personal |
| `created_at` / `updated_at` | timestamptz | |

### `task_labels`

| Column | Type | Notes |
|--------|------|--------|
| `task_id` | uuid | FK → `tasks` |
| `label_id` | uuid | FK → `labels` |
| | | Attachability: active global or own active personal |

### `label_categories`

| Column | Type | Notes |
|--------|------|--------|
| `label_id` | uuid | FK → `labels` ON DELETE CASCADE; global only (trigger) |
| `category_id` | uuid | FK → `categories` ON DELETE CASCADE |
| `created_at` | timestamptz | Default now |
| | PK | `(label_id, category_id)` |

### `task_due_date_changes`

| Column | Type | Notes |
|--------|------|--------|
| `task_id` | uuid | FK → `tasks` |
| `user_id` | uuid | FK → `auth.users` |
| `previous_due_at` / `new_due_at` | timestamptz | |
| `change_direction` | text | set, cleared, moved_later, moved_earlier, changed |

### `task_subtasks`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | Primary key |
| `task_id` | uuid | FK → `tasks` ON DELETE CASCADE |
| `user_id` | uuid | FK → `auth.users` |
| `title` | text | Required |
| `completed` | boolean | Default false |
| `sort_order` | int | Checklist order |
| `created_at` / `updated_at` | timestamptz | |

## Key file map

| Area | Paths |
|------|--------|
| Tasks page | `src/app/dashboard/tasks/page.tsx` |
| Focus page | `src/app/dashboard/focus/page.tsx`, `src/lib/tasks/focus.ts` |
| Recurrence | `src/lib/tasks/recurrence.ts`, `src/lib/tasks/complete-with-recurrence.ts`, `src/components/tasks/recurrence-select.tsx`, `sql/tasks_recurrence.sql` |
| Task components | `src/components/tasks/*` |
| Label picker | `src/components/tasks/label-select.tsx` |
| Label ↔ category | `src/lib/labels/category-links.ts`, `src/components/admin/label-category-link-fields.tsx` |
| Due datetime UI | `src/components/tasks/due-datetime-fields.tsx`, `src/lib/tasks/due-datetime.ts` |
| Reminders | `src/lib/tasks/reminder.ts`, `src/components/tasks/reminder-fields.tsx`, `sql/tasks_reminder_at.sql` |
| Priority | `src/lib/tasks/priority.ts`, `src/components/tasks/priority-select.tsx`, `sql/tasks_priority.sql` |
| Labels lib | `src/lib/labels/*` |
| Settings | `src/app/dashboard/settings/page.tsx`, `src/components/settings/*` |
| Calendar | `src/app/dashboard/calendar/page.tsx`, `src/components/calendar/*`, `src/lib/tasks/calendar*.ts` |
| Subtasks | `src/lib/tasks/subtasks/*`, `src/components/tasks/task-subtask-*.tsx` |
| Theme | `src/components/theme/*` |
| Categories | `src/lib/categories/*` |
| Admin | `src/app/dashboard/admin/*`, `src/components/admin/*` |
| SQL scripts | `sql/task_subtasks.sql`, `sql/labels_personal_select_archived.sql`, `sql/label_categories.sql`, `sql/tasks_reminder_at.sql`, `sql/tasks_priority.sql`, `sql/tasks_recurrence.sql`, `sql/categories_personal_and_access.sql` |
| Docs | `docs/database-schema.sql`, `docs/rls-policies.md`, `docs/test-checklist.md` |

## Latest important commits

| Commit | Summary |
|--------|---------|
| `f01e545` | Scope global labels by category (Phase C picker) |
| `a6cc5f8` | Add admin label category links (Phases A–B) |
| `7c242e8` | Keep quick-add FAB fixed to viewport |
| `bbd8231` | Restore calendar view switcher |
| `f1f1ebc` | Add task search, status filter, and sorting |
| `36be06a` | Fix archived personal label visibility (RLS SQL) |
| `8410c63` | Add user settings page (theme + personal labels) |
| `70f8b50` | Fix task time input 5-minute increments |
| `d7e12fb` | Fix label creation inside task modal |
| `1c7c5cf` | Add subtasks checklist |
| `9be02a4` | Open calendar tasks in modal |
| `5e304ce` | Add calendar month view |
| `bb2828f` / `c58730c` | next-themes + dark mode polish |
| `e618bb1` | Label management on task forms |
| `6bdbb25` | Admin-managed task categories (Phases A–D) |

## Next recommended step

Manual-test recurring complete (spawn next due, labels, subtasks, reminders), then deployment prep or polish.
