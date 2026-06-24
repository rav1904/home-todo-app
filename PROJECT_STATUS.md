# Project Status

Last updated: 2026-06-13

## Current branch

`feature/task-schema`

## Current milestone

**Basic tasks — create, list, and complete** (toggle in progress)

## What is working

- Next.js app shell with dashboard layout and sidebar
- Google-only login (OAuth → `/auth/callback` → dashboard)
- Session handling via Supabase SSR (middleware, server/client clients)
- Protected routes (`/` and `/dashboard/*` require auth)
- Sign out
- Tasks page reads and displays the current user's tasks from Supabase (title, description, due date, completed, created date)
- Add task form (title required; description and due date optional)
- Mark complete toggle (checkbox updates `completed` via Supabase)

## What is not built yet

- Task edit or delete in the app
- Dashboard stats (still hardcoded zeros)
- Labels, categories, reminders, recurrence, assignment, permissions / household sharing
- Supabase migration files in the repo
- Deployment docs beyond default Next.js README

## Supabase setup status

| Item | Status |
|------|--------|
| Project linked (`.env.local`) | Done |
| Google OAuth provider | Done |
| Redirect URLs (`/auth/callback`) | Done |
| Email/password auth | Disabled in UI; disable in Supabase dashboard if not already |
| RLS on `tasks` | Verified locally (select + insert; update policy needed for toggle) |
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
| `324827b` | Task list UI, AddTaskForm, read from Supabase |
| `3d34137` | Add environment variable example file |
| `f3262c2` | Make login Google-only |
| `79b0456` | Added Google sign-in button |
| `9241ce9` | Add Supabase client dependencies for authentication |

**Uncommitted:** mark-complete toggle

## Next recommended step

Verify toggle locally (check/uncheck, RLS on update). Then add **task delete** or wire **dashboard stats** from real task counts.
