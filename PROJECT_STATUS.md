# Project Status

Last updated: 2026-07-27

## Current branch

`main`

## Current milestone

**v0.5 — Categories (Phases A–D complete)**

## What is working

### Auth & shell
- Google-only login
- Supabase connection
- Protected dashboard routes
- Sidebar: Overview, Tasks; Admin link for admin only

### Tasks (user-facing)
- Add, list, complete, delete tasks
- Edit task (title, description, due date/time, completed status)
- Due date change tracking (`task_due_date_changes`) with neutral counts and moved-later nudge (≥3)
- Private user task lists using RLS

### Dashboard
- Live stats: open, due today, overdue, completed
- Sections: Due today, Due within a week, Upcoming

### Categories (Phases A–D)
- **`categories` table** — global admin-managed tree (main + sub), colour, icon, sort order, archive via `active`
- **`tasks.category_id`** — optional assignment to main or subcategory
- **Admin** — `/dashboard/admin/categories` (create, edit, archive/reactivate, custom/A-Z/Z-A sort, drag + arrows)
- **Task assignment** — main + optional sub dropdowns on add/edit; badge on task card (`Main > Sub`, icon, colour)
- **Task filtering** — tasks page filter bar with URL param `?category=` (all, uncategorized, main broad, sub exact)
- 20 Lucide icons; preset colours + validated hex

### Admin (users)
- Admin panel at `/dashboard/admin`
- Read-only user list with Google profile metadata
- Aggregate task counts per user (total, outstanding, completed)
- Admin sub-nav: Users | Categories
- Admin cannot see other users’ task content

## Privacy / security

- Only `nirav@slbenfica.co.uk` is admin
- `ADMIN_EMAIL` is server-side only
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only
- Service role is used only for Auth Admin user listing and aggregate task counts — not for categories or task content
- Task RLS unchanged (`user_id = auth.uid()`)
- Admin does not see task titles, descriptions, due dates, or task lists for other users

## What is not built yet

- Labels / tags
- Reminders
- Recurring tasks
- Multi-user task assignment
- Task-level permissions
- Category filter on dashboard (tasks page only)
- Proper profiles table / role table
- Supabase migrations in repo
- Deployment

## Supabase setup status

| Item | Status |
|------|--------|
| Project linked (`.env.local`) | Done |
| Google OAuth provider | Done |
| Redirect URLs (`/auth/callback`) | Done |
| Email/password auth | Disabled in UI |
| RLS on `tasks` | Verified locally (select, insert, update, delete) |
| RLS on `categories` | Active categories readable by users; admin manages all |
| `categories` + `tasks.category_id` (Phase A SQL) | Done (SQL editor) |
| `task_due_date_changes` | Done (SQL editor) |
| Admin env vars (`ADMIN_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`) | Done (server-side only) |
| CLI / migrations in repo | Not set up |

## Database tables created so far

All created in Supabase SQL editor — not versioned in repo.

### `tasks`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → `auth.users` |
| `title` | text | Required |
| `description` | text | Optional |
| `due_at` | timestamptz | Optional |
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

### `task_due_date_changes`

| Column | Type | Notes |
|--------|------|--------|
| `task_id` | uuid | FK → `tasks` |
| `user_id` | uuid | FK → `auth.users` |
| `previous_due_at` / `new_due_at` | timestamptz | |
| `change_direction` | text | set, cleared, moved_later, moved_earlier, changed |

## Key file map

| Area | Paths |
|------|--------|
| Tasks page | `src/app/dashboard/tasks/page.tsx` |
| Task components | `src/components/tasks/*` |
| Category filter | `src/lib/categories/filter.ts`, `src/components/tasks/task-category-filter.tsx` |
| Categories lib | `src/lib/categories/*` |
| Admin categories | `src/app/dashboard/admin/categories/page.tsx`, `src/components/admin/*` |
| Due date history | `src/lib/tasks/due-date-change.ts` |

## Latest important commits

| Commit | Summary |
|--------|---------|
| `6bdbb25` | Admin-managed task categories (Phases A–D) |
| `bcb7718` | Category selection on add/edit and task cards |
| `1e99eb5` | Admin category CRUD panel |
| `cb9593e` | Task due date change tracking |
| `f81d161` | Task edit via TaskListItem refactor |
| `f38fad7` | Admin user list and aggregate task counts |

## Next recommended step

**Labels** or **deployment prep** — categories v1 is complete on the tasks page. Consider versioning Supabase schema in repo before production deploy.
