# Project Status

Last updated: 2026-07-17

## Current branch

`main`

## Current milestone

**v0.4 — Admin user dashboard**

## What is working

- Google-only login
- Supabase connection
- Protected dashboard routes
- Private user task lists using RLS
- Add task
- List tasks
- Complete task
- Delete task
- Dashboard stats
- Next 7 days / Outlook-style dashboard cards (Due today, Due within a week, Upcoming)
- Admin-only sidebar link
- Admin panel at `/dashboard/admin`
- Admin can see read-only user list
- Admin can see Google profile photo, name, email, created date, and last sign-in
- Admin can see aggregate task counts per user: total, outstanding, completed
- Admin cannot see other users’ task content

## Privacy / security

- Only `nirav@slbenfica.co.uk` is admin
- `ADMIN_EMAIL` is server-side only
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only
- Service role is used only for admin user metadata and aggregate counts
- Task RLS remains unchanged
- Admin does not see task titles, descriptions, due dates, or task lists for other users

## What is not built yet

- Task edit
- Labels
- Categories
- Reminders
- Recurring tasks
- Task assignment
- Task-level permissions
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
| Admin env vars (`ADMIN_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`) | Done (server-side only) |
| CLI / migrations in repo | Not set up |

## Database tables created so far

**`tasks`** (created in Supabase SQL editor, not versioned in repo)

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → `auth.users` |
| `title` | text | Required |
| `description` | text | Optional |
| `due_at` | timestamptz | Optional |
| `completed` | boolean | Default false |
| `created_at` | timestamptz | Default now |

## Latest important commits

| Commit | Summary |
|--------|---------|
| `f38fad7` | Admin user list, Google metadata, aggregate task counts |
| `0fd0ea8` | Admin panel foundation |
| `b908671` | Baseline working task dashboard |
| `aa1c56c` | Dashboard task overview |
| `4bf3c50` | Due today / within a week / upcoming dashboard sections |

## Next recommended step

**Task edit** — allow users to edit their own task title, description, due date/time, and completed status.
