# RLS policies

Last updated: 2026-08-08

Documentation of expected Row Level Security behaviour. Apply scripts live under `sql/` where noted. Some older policies were created in the Supabase SQL editor only.

Admin identity in policies uses JWT email `nirav@slbenfica.co.uk` (must match `ADMIN_EMAIL`).

---

## Principles

- Users only see and mutate **their own** task content.
- Admin may manage **global** taxonomy (categories, global labels, label–category links) and aggregate user stats via service role — **not** other users’ task bodies, personal labels, or reminders.
- Personal labels are private to `created_by`.
- Soft-archive (`active = false`) hides items from pickers in the app; Settings can still load the owner’s archived personal labels after the personal SELECT fix.

---

## `tasks`

| Op | Who | Rule |
|----|-----|------|
| SELECT / INSERT / UPDATE / DELETE | Owner | `user_id = auth.uid()` |

Admin does **not** use these policies to read other users’ task rows in the UI.

**Reminders v1:** Columns on `tasks` (`sql/tasks_reminder_at.sql`):

| Column | Role |
|--------|------|
| `reminder_at` | Resolved datetime for lists/cards |
| `reminder_mode` | `NULL` \| `custom` \| `relative_due` |
| `reminder_offset_minutes` | For `relative_due`: 60 / 1440 / 10080 |

No new RLS policies — existing task owner policies cover all three. Reminder data is never exposed to admin for other users.

**Priority v1:** `priority` text NOT NULL DEFAULT `'medium'` (`sql/tasks_priority.sql`), values `low` | `medium` | `high` | `urgent`. No new RLS — covered by task owner policies. Admin does not see other users’ priorities via task content.

**Recurrence v1:** Columns on `tasks` (`sql/tasks_recurrence.sql`):

| Column | Role |
|--------|------|
| `recurrence` | `none` / interval values; recurring requires `due_at` |
| `spawned_from_task_id` | Parent occurrence; unique when set (dedup) |

RPC `complete_task_with_recurrence(uuid)` runs as **SECURITY DEFINER** with `auth.uid()` ownership checks (owner-only). Completes the task and optionally inserts the next occurrence (labels + subtask templates). No new table policies. If an older INVOKER revision is installed, re-run `sql/tasks_recurrence_rpc_fix.sql`.

---

## `categories`

Source: `sql/categories_personal_and_access.sql` (replaces earlier editor-only policies).

| Op | Who | Rule |
|----|-----|------|
| SELECT | Owner | Own Personal (`scope = 'personal'` and `user_id = auth.uid()`) |
| SELECT | Non-admin | Active global mains with a grant, or active global subs whose parent is granted |
| SELECT | Admin | All global categories (any `active`); **not** other users’ Personal |
| INSERT / UPDATE / DELETE | Admin | Global only (`scope = 'global'`) |

Personal rows are provisioned by `ensure_personal_category_for_user` / `ensure_my_personal_category` / `auth.users` trigger — not by client INSERT policies.

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
| SELECT | Authenticated | Active **global** labels (`scope = 'global'`, typically `active = true` for picker queries) |
| SELECT | Owner | Own **personal** labels (`scope = 'personal'` and `created_by = auth.uid()`), **including archived** after `sql/labels_personal_select_archived.sql` |
| INSERT / UPDATE | Owner | Personal labels only (`created_by = auth.uid()`, `scope = 'personal'`) |
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
| ALL | Task owner | Rows only for tasks where `tasks.user_id = auth.uid()` |
| Attach | App | Only active global, or own active personal labels |

Changing a task’s category does **not** require deleting `task_labels` rows (Phase C keeps existing attachments).

---

## `label_categories`

Source: `sql/label_categories.sql`

| Policy | Op | Rule |
|--------|----|------|
| Users can view label links for usable categories | SELECT | Admin, or `user_can_use_category(category_id)` |
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
| SELECT / INSERT | Owner | `user_id = auth.uid()` |
| INSERT | Owner | Also: `task_id` belongs to a task owned by `auth.uid()` |

Admin must not read other users’ due-date history via the session client.

---

## `task_subtasks`

Source: `sql/task_subtasks.sql`

| Policy | Op | Rule |
|--------|----|------|
| Users select own task subtasks | SELECT | `user_id = auth.uid()` |
| Users insert own task subtasks | INSERT | `user_id = auth.uid()` **and** parent task owned by user |
| Users update own task subtasks | UPDATE | Same ownership checks on `using` / `with check` |
| Users delete own task subtasks | DELETE | `user_id = auth.uid()` **and** parent task owned by user |

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
