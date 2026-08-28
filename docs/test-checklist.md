# Test checklist

Last updated: 2026-08-08

Manual checks for current product behaviour. Prefer a fresh browser session (or private window) when verifying privacy.

---

## Recurrence v1 (SQL)

- [x] Columns + unique `spawned_from_task_id` + RPC (`sql/tasks_recurrence.sql`)

## Recurrence v1 (app)

- [ ] Repeat select on add/edit/quick-add/calendar edit
- [ ] Recurring requires due date
- [ ] Complete (checkbox) spawns next occurrence once
- [ ] Edit save → complete uses RPC (no bare completed flip)
- [ ] Labels, priority, category, recurrence, subtasks copied; relative/custom reminders correct
- [ ] Double-complete creates only one child
- [ ] Calendar still by `due_at`
- [ ] Uncomplete does not delete spawned child

## Focus View v1

- [ ] Sidebar Focus between Overview and Tasks → `/dashboard/focus`
- [ ] Open tasks only; completed disappear after refresh
- [ ] Exclusive sections: overdue → due today → reminders → high/urgent → up next (max 5)
- [ ] No duplicate task across sections
- [ ] Sort within sections matches priority/due/reminder rules
- [ ] Full TaskListItem edit/complete/subtasks/labels work
- [ ] All caught up empty state when nothing to show
- [ ] Light/dark + mobile; no schema/RLS changes

## Priority v1 (SQL)

- [x] `tasks.priority` NOT NULL DEFAULT `'medium'` + CHECK (`sql/tasks_priority.sql`)
- [x] No new RLS

## Priority v1 (app)

- [ ] Default Medium on create
- [ ] Add/edit/quick-add/calendar modal can set Low–Urgent
- [ ] Card badge readable in light/dark
- [ ] Sort Priority: Urgent → High → Medium → Low; ties by created newest
- [ ] Works with category/label/status/search filters
- [ ] Calendar placement still by `due_at`; high/urgent show small dot
- [ ] No priority filter in v1

## Reminders v1 (SQL)

- [x] `reminder_at`, `reminder_mode`, `reminder_offset_minutes` + CHECKs (`sql/tasks_reminder_at.sql`)
- [x] Partial index; no new RLS

## Reminders v1 (app)

- [ ] No reminder / custom / 1h / 1d / 1w before due
- [ ] Relative options disabled without due date + helper text
- [ ] Changing due recalculates relative `reminder_at`
- [ ] Clearing due while relative → no reminder
- [ ] Custom independent of due; 5-minute step
- [ ] Dashboard uses `reminder_at`; calendar uses `due_at` only
- [ ] No `task_due_date_changes` for reminder edits
- [ ] Completed tasks not active reminders
- [ ] Light/dark + mobile
- [ ] Quick-add + calendar modal

---

## Auth & shell

- [ ] Google sign-in: approved → dashboard; unapproved → `/access-request`
- [ ] Unauthenticated visit to `/dashboard/*` or `/access-request` redirects to login
- [ ] Sign out works; session cleared
- [ ] Theme: System / Light / Dark via header menu; survives refresh
- [ ] Sidebar: Overview, Tasks, Calendar, Settings; Admin only for admin email
- [ ] FAB quick-add stays fixed and usable on mobile and desktop

## Access control

- [ ] Apply `sql/app_access_control.sql` then confirm admin still opens dashboard/admin **before** deploying app gate
- [ ] Admin email always allowed (`is_app_admin` / `ADMIN_EMAIL`) even if allowlist revoked
- [ ] Unapproved Google user reaches Access Request; cannot load tasks via client
- [ ] Submit request → success copy; pending appears in Admin → Access
- [ ] Approve → user can use app; Personal category created
- [ ] Reject → still blocked; can submit again later
- [ ] Manual add email → Google login works without a prior request
- [ ] Revoke → redirected to Access Request; RLS blocks data
- [ ] Re-approve restores access
- [ ] Admin still cannot see other users’ Personal task content
- [ ] No Personal category for brand-new unapproved Auth users

## Shared workspaces

- [ ] Apply `sql/shared_workspace_tasks.sql` (after app access + category access SQL)
- [ ] Admin creates Primon task; granted member sees it; without grant does not
- [ ] Subcategory inherits top-level membership
- [ ] Member creates shared task; other members/admin see it
- [ ] Personal tasks stay private both ways (incl. admin)
- [ ] Null-category tasks stay owner-only
- [ ] Member can edit/complete shared task but cannot delete unless creator
- [ ] Admin can delete shared task but not others’ Personal/null tasks
- [ ] Cannot move others’ shared task into Personal
- [ ] Recurring shared complete keeps original creator on next occurrence
- [ ] Calendar / Focus / Dashboard / Search include only visible shared + Personal
- [ ] Admin Categories UI shows member count/list + admin note
- [ ] `npm run build` passes

---

## Tasks CRUD

- [ ] Create task (title only; with description; with due date/time)
- [ ] Due time respects 5-minute steps / normalisation on save
- [ ] Toggle complete / incomplete
- [ ] Edit title, description, due, category, labels, completed
- [ ] Delete with confirm
- [ ] Deep link `/dashboard/tasks?edit=<id>` opens edit for that task
- [ ] Another user’s tasks never appear (RLS)

---

## Search, filter, sort (tasks page)

- [ ] Category filter (`?category=`)
- [ ] Label filter (`?label=`)
- [ ] Search `q` matches title/description as implemented
- [ ] Status filter (open / completed / all as UI provides)
- [ ] Sort options reorder the list
- [ ] Combined filters compose; clearing params resets
- [ ] `?edit=` still surfaces the task even if filters would hide it

---

## Categories

- [ ] Admin: create main + subcategory; edit; archive / reactivate; reorder
- [ ] User: assign main / sub on add and edit; badge on card
- [ ] Archived category hidden from user pickers
- [ ] Clearing category on a task works

---

## Labels — personal

- [ ] Create personal label from task LabelSelect (“Create and select”)
- [ ] Create / edit / archive / reactivate from Settings
- [ ] Personal labels always appear in picker regardless of category
- [ ] Creating personal label inside modal does **not** submit/close parent form
- [ ] Cancel on create personal label clears draft only
- [ ] Admin cannot see another user’s personal labels
- [ ] User B cannot see user A’s personal labels

---

## Labels — global + category links (Phases A–B)

Prerequisite: `sql/label_categories.sql` applied.

- [ ] Admin Labels: create global label with category/sub links; save
- [ ] Admin: edit links (add/remove mains and subs); row summary updates
- [ ] Cannot link a personal label (trigger / admin UI only shows globals)
- [ ] Non-admin cannot insert/delete `label_categories` rows

---

## Label picker scoping (Phase C)

- [ ] **No category:** only personal labels; helper copy about selecting a category
- [ ] **Main with links:** linked globals + personal appear
- [ ] **Main with no links:** no globals (or empty shared section); personal still there
- [ ] **Subcategory:** globals linked to sub **or** parent main + personal
- [ ] Change category after selecting a global: selection **kept**; may leave shared list but still under “Selected”
- [ ] Existing task with “orphaned” global label still shows that label on the card / selected list
- [ ] Saving does not strip labels the user did not remove
- [ ] Same behaviour in quick-add FAB and calendar task edit modal
- [ ] Light and dark: label pills readable; usable on mobile

---

## Subtasks

- [ ] Add / toggle / reorder / delete on task card
- [ ] Progress indicator updates
- [ ] Works in calendar task modal
- [ ] Not available on create form (v1 expected)
- [ ] Subtasks of other users’ tasks inaccessible

---

## Calendar

- [ ] Month / week / day / list views switch via URL/UI
- [ ] Chips open modal; edit/save/delete refreshes calendar
- [ ] Tasks without due date handled as designed (not wrongly placed)

---

## Due date history

- [ ] Changing due date inserts history row with correct `change_direction`
- [ ] Card shows update / moved later / moved earlier counts
- [ ] Moved-later nudge at ≥ 3 only
- [ ] Unchanged due date on save does not insert a row

---

## Admin privacy

- [ ] Users page: aggregates only; no other users’ titles/descriptions
- [ ] Categories / Labels admin do not expose personal labels or task content

---

## Regression smoke

- [ ] `npm run build` succeeds
- [ ] Dark mode: forms, filters, label picker, admin panels
- [ ] Settings theme + personal labels still work after Phase C
