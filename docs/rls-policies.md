# RLS policies

Last updated: 2026-08-12

Documentation of expected Row Level Security behaviour. Apply scripts live under `sql/` where noted. Some older policies were created in the Supabase SQL editor only.

Admin identity in policies uses JWT email `nirav@slbenfica.co.uk` (must match `ADMIN_EMAIL`).

App membership uses `public.is_app_allowed()` (`sql/app_access_control.sql`): true when `is_app_admin()` **or** an `app_allowed_users` row exists with `status = 'approved'` for the JWT email. Admin is always allowed even if the allowlist row is missing or revoked.

---

## Principles

- Approved users only (`is_app_allowed()`).
- Personal and null-category tasks are **owner-only**.
- Global top-level categories are **shared workspaces**; members see/edit tasks via grants (`user_category_access`).
- Admin sees/edits all shared/global tasks but **not** others’ Personal or null-category tasks.
- Delete: creator, or admin on shared tasks only.
- Unapproved users must not read/write core app tables.
- Admin may manage global taxonomy, access requests / allowlist, and Auth user metadata — **not** other users’ Personal task bodies.
- Personal labels are private to `created_by`.

---

## `app_allowed_users` / `access_requests`

Source: `sql/app_access_control.sql`

| Table | Op | Who | Rule |
|-------|----|-----|------|
| `app_allowed_users` | SELECT | Owner or admin | Own email row, or all if admin |
| `app_allowed_users` | INSERT / UPDATE | Admin | Admin email only (prefer admin RPCs) |
| `access_requests` | SELECT | Owner or admin | Own rows, or all if admin |
| `access_requests` | INSERT | Requester | Own uid + JWT email + pending + not allowed |
| `access_requests` | UPDATE | Admin | Approve/reject (prefer admin RPCs) |

Preferred mutations: `submit_access_request`, `admin_approve_access_request`, `admin_reject_access_request`, `admin_add_allowed_email`, `admin_revoke_allowed_email`, `admin_reapprove_allowed_email`.

---

## Shared workspaces (`sql/shared_workspace_tasks.sql`)

| Helper | Rule |
|--------|------|
| `user_can_access_task` | Own task, or non-personal category with `user_can_use_category` (admin ⇒ all globals) |
| `user_can_mutate_task` | Same as access (v1) |
| `user_can_delete_task` | Creator, or admin when category is shared/global |

Policies: `"Users select accessible tasks"`, `"Users insert own tasks"`, `"Users update accessible tasks"`, `"Users delete deletable tasks"`. Related `task_labels` / `task_subtasks` / `task_due_date_changes` follow parent task access/mutate.

Recurrence RPC: mutate access; spawned row keeps **parent `user_id`**.

---

## `tasks`

| Op | Who | Rule |
|----|-----|------|
| SELECT | Owner or workspace member | `user_can_access_task(id)` |
| INSERT | Creator | `user_id = auth.uid()` + allowed + usable category (or null) |
| UPDATE | Owner or workspace member | `user_can_mutate_task(id)`; creator immutable |
| DELETE | Creator or admin (shared only) | `user_can_delete_task(id)` |

Admin does **not** get blanket SELECT on all tasks.

**Reminders v1:** Columns on `tasks` (`sql/tasks_reminder_at.sql`):

| Column | Role |
|--------|------|
| `reminder_at` | Resolved datetime for lists/cards |
| `reminder_mode` | `NULL` \| `custom` \| `relative_due` |
| `reminder_offset_minutes` | For `relative_due`: 60 / 1440 / 10080 |

No new RLS policies — existing task owner policies cover all three. Reminder data is never exposed to admin for other users.

**Priority v1:** `priority` text NOT NULL DEFAULT `'medium'` (`sql/tasks_priority.sql`), values `low` | `medium` | `high` | `urgent`. No new RLS — covered by task owner policies. Admin does not see other users’ priorities via task content.

**Cancel v1:** Columns on `tasks` (`sql/cancel_tasks.sql`):

| Column | Notes |
|--------|--------|
| `cancelled_at` | Soft-cancel timestamp; null = not cancelled |
| `cancelled_by` | `auth.users` who cancelled |

Open views = `completed = false` AND `cancelled_at IS NULL`. Cancel is **not** complete and does **not** call `complete_task_with_recurrence`. Covered by existing `"Users update accessible tasks"` (owner or shared workspace member). No new RLS. Personal/null-category remain owner-only; admin still cannot see others’ Personal tasks.

**Recurrence v1:** Columns on `tasks` (`sql/tasks_recurrence.sql`):

| Column | Role |
|--------|------|
| `recurrence` | `none` / interval values; recurring requires `due_at` |
| `spawned_from_task_id` | Parent occurrence; unique when set (dedup) |

RPC `complete_task_with_recurrence(uuid)` runs as **SECURITY DEFINER** with `is_app_allowed()`, `user_can_mutate_task`, and spawn **`user_id = parent.user_id`** (creator preserved). Idempotent via unique `spawned_from_task_id`. Apply `sql/shared_workspace_tasks.sql` after earlier recurrence scripts.

---

## `categories`

Source: `sql/categories_personal_and_access.sql` (replaces earlier editor-only policies).

| Op | Who | Rule |
|----|-----|------|
| SELECT | Owner | Own Personal (`scope = 'personal'` and `user_id = auth.uid()`) **and** `is_app_allowed()` |
| SELECT | Non-admin | Active global mains with a grant, or active global subs whose parent is granted **and** `is_app_allowed()` |
| SELECT | Admin | All global categories (any `active`); **not** other users’ Personal |
| INSERT / UPDATE / DELETE | Admin | Global only (`scope = 'global'`) |

Personal rows are provisioned by `ensure_personal_category_for_user` / `ensure_my_personal_category` (allowed users only) — not by client INSERT policies. Auth signup no longer auto-creates Personal (`sql/app_access_control.sql`).

Global categories cannot be named `Personal`. One Personal category per user.

---

## `user_category_access`

Source: `sql/categories_personal_and_access.sql`

| Op | Who | Rule |
|----|-----|------|
| SELECT | Owner or admin | Own grants, or all grants if admin |
| INSERT / DELETE | Admin | Admin email only |

Trigger: granted `category_id` must be global top-level (`scope = 'global'`, `parent_id` null). Personal is never stored here.

---

## Task category assignment

Trigger `tasks_enforce_category_access` (not RLS WITH CHECK):

- `category_id` null allowed (legacy uncategorised)
- UPDATE with unchanged `category_id` allowed (complete/edit after revoke)
- INSERT with `spawned_from_task_id`: parent must exist; `NEW.user_id = parent.user_id`; `NEW.category_id` must match parent (no generic spawn bypass)
- Else require `user_can_use_category(category_id)` (own Personal, admin globals, or grant tree)

---

## `labels`

| Op | Who | Rule (expected) |
|----|-----|-----------------|
| SELECT | Authenticated (allowed) | Active **global** labels (`scope = 'global'`, `active = true`) **and** `is_app_allowed()` |
| SELECT | Admin | All **global** labels |
| SELECT | Owner | Own **personal** labels (`scope = 'personal'` and `created_by = auth.uid()`), **including archived**, **and** `is_app_allowed()` |
| INSERT / UPDATE | Owner | Personal labels only (`created_by = auth.uid()`, `scope = 'personal'`) **and** `is_app_allowed()` |
| INSERT / UPDATE / DELETE (archive) | Admin | **Global** labels only |

**Privacy checks**

- Admin cannot SELECT another user’s personal labels.
- User A cannot SELECT user B’s personal labels.
- Task pickers still request `active = true` in application code.

Repo script: `sql/labels_personal_select_archived.sql` (replaces personal SELECT so Settings can list archived personal labels).

---

## `task_labels`

| Op | Who | Rule (expected) |
|----|-----|-----------------|
| ALL | Task owner | Rows only for tasks where `tasks.user_id = auth.uid()` **and** `is_app_allowed()` |
| Attach | App | Only active global, or own active personal labels |

Changing a task’s category does **not** require deleting `task_labels` rows (Phase C keeps existing attachments).

---

## `label_categories`

Source: `sql/label_categories.sql`

| Policy | Op | Rule |
|--------|----|------|
| Users can view label links for usable categories | SELECT | Admin, or (`is_app_allowed()` and `user_can_use_category(category_id)`) |
| Admin can insert label category links | INSERT | Admin email **and** linked label `scope = 'global'` |
| Admin can delete label category links | DELETE | Admin email |

**Triggers:**
- `label_categories_require_global_label` — only global labels may be linked
- `label_categories_require_global_category` — only global categories may be linked (never Personal)

Personal labels must never appear in this table. Personal categories must never appear in this table.

---

## `task_due_date_changes`

| Op | Who | Rule (expected) |
|----|-----|-----------------|
| SELECT / INSERT | Owner | `user_id = auth.uid()` **and** `is_app_allowed()` |
| INSERT | Owner | Also: `task_id` belongs to a task owned by `auth.uid()` |

Admin must not read other users’ due-date history via the session client.

---

## `task_subtasks`

Source: `sql/task_subtasks.sql`

| Policy | Op | Rule |
|--------|----|------|
| Users select own task subtasks | SELECT | `user_id = auth.uid()` **and** `is_app_allowed()` |
| Users insert own task subtasks | INSERT | `user_id = auth.uid()` **and** `is_app_allowed()` **and** parent task owned by user |
| Users update own task subtasks | UPDATE | Same ownership checks on `using` / `with check` (+ allowed) |
| Users delete own task subtasks | DELETE | `user_id = auth.uid()` **and** `is_app_allowed()` **and** parent task owned by user |

---

## Service role

Used **only** for:

- Auth Admin user listing
- Aggregate task counts on the admin users page

Not used for categories, labels, label links, task content, subtasks, or due-date history in the app.

---

## App-layer rules (not RLS)

Phase C label picker filtering is **application logic** (`src/lib/labels/category-links.ts`, `LabelSelect`):

- Filters which global labels are offered based on `label_categories` + selected category.
- Personal category (and no category) → personal labels only.
- Does not change RLS or auto-detach labels.
