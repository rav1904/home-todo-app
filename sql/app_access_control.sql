-- =============================================================================
-- App access control: allowlist + access requests
-- Run in Supabase SQL editor BEFORE deploying app gate code.
--
-- Safe for admin:
--   1. Seeds nirav@slbenfica.co.uk as approved/bootstrap
--   2. is_app_allowed() always returns true when is_app_admin() is true
--   3. Admin keeps access even if allowlist row is missing or revoked
--
-- After apply: confirm admin can still open /dashboard and /dashboard/admin
-- (RLS still allows admin via is_app_admin → is_app_allowed). Then deploy app.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Tables
-- -----------------------------------------------------------------------------
create table if not exists public.app_allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  status text not null
    check (status in ('approved', 'revoked')),
  source text not null
    check (source in ('manual', 'request', 'bootstrap')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  constraint app_allowed_users_email_lower check (email = lower(email))
);

create unique index if not exists app_allowed_users_email_uidx
  on public.app_allowed_users (email);

create index if not exists app_allowed_users_status_idx
  on public.app_allowed_users (status);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  constraint access_requests_email_lower check (email = lower(email)),
  constraint access_requests_message_len check (
    message is null or char_length(message) <= 1000
  )
);

create unique index if not exists access_requests_one_pending_email_uidx
  on public.access_requests (email)
  where status = 'pending';

create index if not exists access_requests_status_created_idx
  on public.access_requests (status, created_at desc);

-- -----------------------------------------------------------------------------
-- 1) is_app_allowed() — admin ALWAYS allowed
-- -----------------------------------------------------------------------------
create or replace function public.is_app_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_app_admin()
    or exists (
      select 1
      from public.app_allowed_users u
      where u.status = 'approved'
        and u.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    ),
    false
  );
$$;

revoke all on function public.is_app_allowed() from public;
grant execute on function public.is_app_allowed() to authenticated;

-- -----------------------------------------------------------------------------
-- 2) Seed admin (bootstrap) — never lock out ADMIN_EMAIL / is_app_admin email
-- -----------------------------------------------------------------------------
insert into public.app_allowed_users (email, status, source)
values ('nirav@slbenfica.co.uk', 'approved', 'bootstrap')
on conflict (email) do update
set
  status = 'approved',
  source = case
    when app_allowed_users.source = 'bootstrap' then 'bootstrap'
    else app_allowed_users.source
  end,
  revoked_at = null,
  revoked_by = null,
  updated_at = now();

-- Link user_id if auth user already exists
update public.app_allowed_users a
set
  user_id = u.id,
  updated_at = now()
from auth.users u
where a.email = lower(u.email)
  and a.email = 'nirav@slbenfica.co.uk'
  and (a.user_id is distinct from u.id);

-- -----------------------------------------------------------------------------
-- 3) Personal category: only for allowed users; stop Auth INSERT trigger
-- -----------------------------------------------------------------------------
drop trigger if exists auth_users_ensure_personal_category_trg on auth.users;

create or replace function public.ensure_my_personal_category()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_app_allowed() then
    raise exception 'not_allowed';
  end if;

  return public.ensure_personal_category_for_user(v_uid);
end;
$$;

revoke all on function public.ensure_my_personal_category() from public;
grant execute on function public.ensure_my_personal_category() to authenticated;

-- -----------------------------------------------------------------------------
-- 4) Helper: sync user_id on allowlist for current session
-- -----------------------------------------------------------------------------
create or replace function public.sync_my_allowed_user_id()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_uid is null or v_email = '' then
    return;
  end if;

  update public.app_allowed_users
  set
    user_id = v_uid,
    updated_at = now()
  where email = v_email
    and status = 'approved'
    and (user_id is distinct from v_uid);
end;
$$;

revoke all on function public.sync_my_allowed_user_id() from public;
grant execute on function public.sync_my_allowed_user_id() to authenticated;

-- -----------------------------------------------------------------------------
-- 5) Access request + admin RPCs
-- -----------------------------------------------------------------------------
create or replace function public.submit_access_request(p_message text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_name text;
  v_message text;
  v_id uuid;
begin
  if v_uid is null or v_email = '' then
    raise exception 'not_authenticated';
  end if;

  if public.is_app_allowed() then
    raise exception 'already_allowed';
  end if;

  v_message := nullif(trim(coalesce(p_message, '')), '');
  if v_message is not null and char_length(v_message) > 1000 then
    raise exception 'message_too_long';
  end if;

  v_name := nullif(
    trim(
      coalesce(
        auth.jwt() -> 'user_metadata' ->> 'full_name',
        auth.jwt() -> 'user_metadata' ->> 'name',
        ''
      )
    ),
    ''
  );

  if v_name is null then
    select nullif(
      trim(
        coalesce(
          u.raw_user_meta_data ->> 'full_name',
          u.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    )
    into v_name
    from auth.users u
    where u.id = v_uid;
  end if;

  select id
  into v_id
  from public.access_requests
  where email = v_email
    and status = 'pending'
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.access_requests (
    email,
    user_id,
    display_name,
    message,
    status
  )
  values (
    v_email,
    v_uid,
    v_name,
    v_message,
    'pending'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_access_request(text) from public;
grant execute on function public.submit_access_request(text) to authenticated;

create or replace function public.admin_approve_access_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_req public.access_requests%rowtype;
begin
  if not public.is_app_admin() then
    raise exception 'not_admin';
  end if;

  select *
  into v_req
  from public.access_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'not_pending';
  end if;

  update public.access_requests
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = v_admin
  where id = p_request_id;

  insert into public.app_allowed_users (
    email,
    user_id,
    status,
    source,
    created_by,
    revoked_at,
    revoked_by
  )
  values (
    v_req.email,
    v_req.user_id,
    'approved',
    'request',
    v_admin,
    null,
    null
  )
  on conflict (email) do update
  set
    user_id = coalesce(excluded.user_id, app_allowed_users.user_id),
    status = 'approved',
    source = 'request',
    revoked_at = null,
    revoked_by = null,
    updated_at = now();

  if v_req.user_id is not null then
    perform public.ensure_personal_category_for_user(v_req.user_id);
  end if;
end;
$$;

revoke all on function public.admin_approve_access_request(uuid) from public;
grant execute on function public.admin_approve_access_request(uuid) to authenticated;

create or replace function public.admin_reject_access_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_status text;
begin
  if not public.is_app_admin() then
    raise exception 'not_admin';
  end if;

  select status
  into v_status
  from public.access_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_status <> 'pending' then
    raise exception 'not_pending';
  end if;

  update public.access_requests
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = v_admin
  where id = p_request_id;
end;
$$;

revoke all on function public.admin_reject_access_request(uuid) from public;
grant execute on function public.admin_reject_access_request(uuid) to authenticated;

create or replace function public.admin_add_allowed_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user_id uuid;
  v_id uuid;
begin
  if not public.is_app_admin() then
    raise exception 'not_admin';
  end if;

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'invalid_email';
  end if;

  select id
  into v_user_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  insert into public.app_allowed_users (
    email,
    user_id,
    status,
    source,
    created_by,
    revoked_at,
    revoked_by
  )
  values (
    v_email,
    v_user_id,
    'approved',
    'manual',
    v_admin,
    null,
    null
  )
  on conflict (email) do update
  set
    user_id = coalesce(excluded.user_id, app_allowed_users.user_id),
    status = 'approved',
    source = case
      when app_allowed_users.source = 'bootstrap' then 'bootstrap'
      else 'manual'
    end,
    revoked_at = null,
    revoked_by = null,
    updated_at = now()
  returning id into v_id;

  if v_user_id is not null then
    perform public.ensure_personal_category_for_user(v_user_id);
  end if;

  return v_id;
end;
$$;

revoke all on function public.admin_add_allowed_email(text) from public;
grant execute on function public.admin_add_allowed_email(text) to authenticated;

create or replace function public.admin_revoke_allowed_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not public.is_app_admin() then
    raise exception 'not_admin';
  end if;

  if v_email = '' then
    raise exception 'invalid_email';
  end if;

  -- Never revoke the app admin identity via allowlist
  if v_email = 'nirav@slbenfica.co.uk' then
    raise exception 'cannot_revoke_admin';
  end if;

  update public.app_allowed_users
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by = v_admin,
    updated_at = now()
  where email = v_email
    and status = 'approved';

  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

revoke all on function public.admin_revoke_allowed_email(text) from public;
grant execute on function public.admin_revoke_allowed_email(text) to authenticated;

create or replace function public.admin_reapprove_allowed_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user_id uuid;
begin
  if not public.is_app_admin() then
    raise exception 'not_admin';
  end if;

  if v_email = '' then
    raise exception 'invalid_email';
  end if;

  update public.app_allowed_users
  set
    status = 'approved',
    revoked_at = null,
    revoked_by = null,
    updated_at = now()
  where email = v_email
    and status = 'revoked'
  returning user_id into v_user_id;

  if not found then
    raise exception 'not_found';
  end if;

  if v_user_id is not null then
    perform public.ensure_personal_category_for_user(v_user_id);
  else
    select id
    into v_user_id
    from auth.users
    where lower(email) = v_email
    limit 1;

    if v_user_id is not null then
      update public.app_allowed_users
      set user_id = v_user_id, updated_at = now()
      where email = v_email;

      perform public.ensure_personal_category_for_user(v_user_id);
    end if;
  end if;
end;
$$;

revoke all on function public.admin_reapprove_allowed_email(text) from public;
grant execute on function public.admin_reapprove_allowed_email(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) RLS on new tables
-- -----------------------------------------------------------------------------
alter table public.app_allowed_users enable row level security;
alter table public.access_requests enable row level security;

drop policy if exists "Users can view own allowlist row" on public.app_allowed_users;
drop policy if exists "Admin can view all allowlist rows" on public.app_allowed_users;
drop policy if exists "Admin can insert allowlist rows" on public.app_allowed_users;
drop policy if exists "Admin can update allowlist rows" on public.app_allowed_users;
drop policy if exists "Users can view own access requests" on public.access_requests;
drop policy if exists "Admin can view all access requests" on public.access_requests;
drop policy if exists "Users can insert own access requests" on public.access_requests;
drop policy if exists "Admin can update access requests" on public.access_requests;

create policy "Users can view own allowlist row"
  on public.app_allowed_users
  for select
  to authenticated
  using (
    email = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_app_admin()
  );

create policy "Admin can view all allowlist rows"
  on public.app_allowed_users
  for select
  to authenticated
  using (public.is_app_admin());

-- Mutations go through SECURITY DEFINER admin RPCs; no direct client writes needed.
-- Keep admin UPDATE for emergency SQL-less fixes via session if desired:
create policy "Admin can update allowlist rows"
  on public.app_allowed_users
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy "Admin can insert allowlist rows"
  on public.app_allowed_users
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy "Users can view own access requests"
  on public.access_requests
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_app_admin()
  );

create policy "Admin can view all access requests"
  on public.access_requests
  for select
  to authenticated
  using (public.is_app_admin());

-- Inserts preferred via submit_access_request RPC; direct insert also constrained:
create policy "Users can insert own access requests"
  on public.access_requests
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and status = 'pending'
    and not public.is_app_allowed()
  );

create policy "Admin can update access requests"
  on public.access_requests
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- -----------------------------------------------------------------------------
-- 7) Gate core table policies with is_app_allowed()
--    Drops existing policies and recreates with the same ownership rules + gate.
--    Does NOT add admin read on task content.
-- -----------------------------------------------------------------------------

-- tasks
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'tasks'
  loop
    execute format('drop policy if exists %I on public.tasks', r.policyname);
  end loop;
end;
$$;

create policy "Users select own tasks"
  on public.tasks for select to authenticated
  using (user_id = auth.uid() and public.is_app_allowed());

create policy "Users insert own tasks"
  on public.tasks for insert to authenticated
  with check (user_id = auth.uid() and public.is_app_allowed());

create policy "Users update own tasks"
  on public.tasks for update to authenticated
  using (user_id = auth.uid() and public.is_app_allowed())
  with check (user_id = auth.uid() and public.is_app_allowed());

create policy "Users delete own tasks"
  on public.tasks for delete to authenticated
  using (user_id = auth.uid() and public.is_app_allowed());

-- task_labels
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'task_labels'
  loop
    execute format('drop policy if exists %I on public.task_labels', r.policyname);
  end loop;
end;
$$;

create policy "Users manage labels on own tasks"
  on public.task_labels for all to authenticated
  using (
    public.is_app_allowed()
    and exists (
      select 1 from public.tasks t
      where t.id = task_labels.task_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    public.is_app_allowed()
    and exists (
      select 1 from public.tasks t
      where t.id = task_labels.task_id
        and t.user_id = auth.uid()
    )
  );

-- task_due_date_changes (if present)
do $$
declare
  r record;
begin
  if to_regclass('public.task_due_date_changes') is null then
    return;
  end if;

  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'task_due_date_changes'
  loop
    execute format(
      'drop policy if exists %I on public.task_due_date_changes',
      r.policyname
    );
  end loop;

  execute $pol$
    create policy "Users select own due date changes"
      on public.task_due_date_changes for select to authenticated
      using (user_id = auth.uid() and public.is_app_allowed())
  $pol$;

  execute $pol$
    create policy "Users insert own due date changes"
      on public.task_due_date_changes for insert to authenticated
      with check (
        user_id = auth.uid()
        and public.is_app_allowed()
        and exists (
          select 1 from public.tasks t
          where t.id = task_due_date_changes.task_id
            and t.user_id = auth.uid()
        )
      )
  $pol$;
end;
$$;

-- task_subtasks
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'task_subtasks'
  loop
    execute format('drop policy if exists %I on public.task_subtasks', r.policyname);
  end loop;
end;
$$;

create policy "Users select own task subtasks"
  on public.task_subtasks for select to authenticated
  using (user_id = auth.uid() and public.is_app_allowed());

create policy "Users insert own task subtasks"
  on public.task_subtasks for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_app_allowed()
    and exists (
      select 1 from public.tasks
      where tasks.id = task_subtasks.task_id
        and tasks.user_id = auth.uid()
    )
  );

create policy "Users update own task subtasks"
  on public.task_subtasks for update to authenticated
  using (
    user_id = auth.uid()
    and public.is_app_allowed()
    and exists (
      select 1 from public.tasks
      where tasks.id = task_subtasks.task_id
        and tasks.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and public.is_app_allowed()
    and exists (
      select 1 from public.tasks
      where tasks.id = task_subtasks.task_id
        and tasks.user_id = auth.uid()
    )
  );

create policy "Users delete own task subtasks"
  on public.task_subtasks for delete to authenticated
  using (
    user_id = auth.uid()
    and public.is_app_allowed()
    and exists (
      select 1 from public.tasks
      where tasks.id = task_subtasks.task_id
        and tasks.user_id = auth.uid()
    )
  );

-- categories
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'categories'
  loop
    execute format('drop policy if exists %I on public.categories', r.policyname);
  end loop;
end;
$$;

create policy "Users can view own personal categories"
  on public.categories for select to authenticated
  using (
    scope = 'personal'
    and user_id = auth.uid()
    and public.is_app_allowed()
  );

create policy "Users can view granted active global categories"
  on public.categories for select to authenticated
  using (
    scope = 'global'
    and active = true
    and public.is_app_allowed()
    and not public.is_app_admin()
    and (
      (
        parent_id is null
        and exists (
          select 1 from public.user_category_access g
          where g.user_id = auth.uid()
            and g.category_id = categories.id
        )
      )
      or (
        parent_id is not null
        and exists (
          select 1 from public.user_category_access g
          where g.user_id = auth.uid()
            and g.category_id = categories.parent_id
        )
      )
    )
  );

create policy "Admin can view all global categories"
  on public.categories for select to authenticated
  using (scope = 'global' and public.is_app_admin());

create policy "Admin can insert global categories"
  on public.categories for insert to authenticated
  with check (public.is_app_admin() and scope = 'global' and user_id is null);

create policy "Admin can update global categories"
  on public.categories for update to authenticated
  using (public.is_app_admin() and scope = 'global')
  with check (public.is_app_admin() and scope = 'global' and user_id is null);

create policy "Admin can delete global categories"
  on public.categories for delete to authenticated
  using (public.is_app_admin() and scope = 'global');

-- user_category_access
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'user_category_access'
  loop
    execute format(
      'drop policy if exists %I on public.user_category_access',
      r.policyname
    );
  end loop;
end;
$$;

create policy "Users can view own category grants"
  on public.user_category_access for select to authenticated
  using (
    (user_id = auth.uid() and public.is_app_allowed())
    or public.is_app_admin()
  );

create policy "Admin can insert category grants"
  on public.user_category_access for insert to authenticated
  with check (public.is_app_admin());

create policy "Admin can delete category grants"
  on public.user_category_access for delete to authenticated
  using (public.is_app_admin());

-- labels
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'labels'
  loop
    execute format('drop policy if exists %I on public.labels', r.policyname);
  end loop;
end;
$$;

create policy "Users can view active global labels"
  on public.labels for select to authenticated
  using (
    scope = 'global'
    and active = true
    and public.is_app_allowed()
  );

create policy "Admin can view all global labels"
  on public.labels for select to authenticated
  using (scope = 'global' and public.is_app_admin());

create policy "Users can view their own personal labels"
  on public.labels for select to authenticated
  using (
    scope = 'personal'
    and created_by = auth.uid()
    and public.is_app_allowed()
  );

create policy "Users can insert personal labels"
  on public.labels for insert to authenticated
  with check (
    scope = 'personal'
    and created_by = auth.uid()
    and public.is_app_allowed()
  );

create policy "Users can update personal labels"
  on public.labels for update to authenticated
  using (
    scope = 'personal'
    and created_by = auth.uid()
    and public.is_app_allowed()
  )
  with check (
    scope = 'personal'
    and created_by = auth.uid()
    and public.is_app_allowed()
  );

create policy "Admin can insert global labels"
  on public.labels for insert to authenticated
  with check (public.is_app_admin() and scope = 'global');

create policy "Admin can update global labels"
  on public.labels for update to authenticated
  using (public.is_app_admin() and scope = 'global')
  with check (public.is_app_admin() and scope = 'global');

create policy "Admin can delete global labels"
  on public.labels for delete to authenticated
  using (public.is_app_admin() and scope = 'global');

-- label_categories
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'label_categories'
  loop
    execute format(
      'drop policy if exists %I on public.label_categories',
      r.policyname
    );
  end loop;
end;
$$;

create policy "Users can view label links for usable categories"
  on public.label_categories for select to authenticated
  using (
    public.is_app_admin()
    or (
      public.is_app_allowed()
      and public.user_can_use_category(category_id)
    )
  );

create policy "Admin can insert label category links"
  on public.label_categories for insert to authenticated
  with check (
    public.is_app_admin()
    and exists (
      select 1 from public.labels l
      where l.id = label_categories.label_id
        and l.scope = 'global'
    )
  );

create policy "Admin can delete label category links"
  on public.label_categories for delete to authenticated
  using (public.is_app_admin());

-- -----------------------------------------------------------------------------
-- 8) RPC gate: complete_task_with_recurrence — ownership unchanged + allowed
-- -----------------------------------------------------------------------------
create or replace function public.complete_task_with_recurrence(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_existing_child_id uuid;
  v_next_due timestamptz;
  v_next_reminder_at timestamptz;
  v_next_reminder_mode text;
  v_next_reminder_offset integer;
  v_next_id uuid;
  v_delta interval;
begin
  if v_uid is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_authenticated'
    );
  end if;

  if not public.is_app_allowed() then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_allowed'
    );
  end if;

  select *
  into v_task
  from public.tasks
  where id = p_task_id
    and user_id = v_uid
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found'
    );
  end if;

  if v_task.completed then
    select id
    into v_existing_child_id
    from public.tasks
    where spawned_from_task_id = p_task_id
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'already_completed', true,
      'next_task_id', v_existing_child_id,
      'recurrence', v_task.recurrence,
      'due_at', v_task.due_at
    );
  end if;

  if v_task.recurrence = 'none' or v_task.due_at is null then
    update public.tasks
    set completed = true
    where id = p_task_id
      and user_id = v_uid;

    return jsonb_build_object(
      'ok', true,
      'already_completed', false,
      'next_task_id', null,
      'recurrence', v_task.recurrence,
      'due_at', v_task.due_at
    );
  end if;

  select id
  into v_existing_child_id
  from public.tasks
  where spawned_from_task_id = p_task_id
  limit 1;

  if v_existing_child_id is not null then
    update public.tasks
    set completed = true
    where id = p_task_id
      and user_id = v_uid;

    return jsonb_build_object(
      'ok', true,
      'already_completed', false,
      'next_task_id', v_existing_child_id,
      'recurrence', v_task.recurrence,
      'due_at', v_task.due_at,
      'duplicate_prevented', true
    );
  end if;

  v_next_due := public.task_next_due_at(v_task.due_at, v_task.recurrence);

  if v_next_due is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'could_not_compute_next_due',
      'recurrence', v_task.recurrence,
      'due_at', v_task.due_at
    );
  end if;

  v_next_reminder_at := null;
  v_next_reminder_mode := null;
  v_next_reminder_offset := null;

  if v_task.reminder_mode = 'relative_due'
     and v_task.reminder_offset_minutes is not null then
    v_next_reminder_mode := 'relative_due';
    v_next_reminder_offset := v_task.reminder_offset_minutes;
    v_next_reminder_at :=
      v_next_due - make_interval(mins => v_task.reminder_offset_minutes);
  elsif v_task.reminder_mode = 'custom' and v_task.reminder_at is not null then
    v_delta := v_next_due - v_task.due_at;
    v_next_reminder_at := v_task.reminder_at + v_delta;
    if v_next_reminder_at is not null then
      v_next_reminder_mode := 'custom';
      v_next_reminder_offset := null;
    end if;
  end if;

  begin
    insert into public.tasks (
      user_id,
      title,
      description,
      due_at,
      completed,
      category_id,
      priority,
      recurrence,
      spawned_from_task_id,
      reminder_at,
      reminder_mode,
      reminder_offset_minutes
    )
    values (
      v_uid,
      v_task.title,
      v_task.description,
      v_next_due,
      false,
      v_task.category_id,
      coalesce(v_task.priority, 'medium'),
      v_task.recurrence,
      p_task_id,
      v_next_reminder_at,
      v_next_reminder_mode,
      v_next_reminder_offset
    )
    returning id into v_next_id;
  exception
    when unique_violation then
      select id
      into v_next_id
      from public.tasks
      where spawned_from_task_id = p_task_id
      limit 1;

      if v_next_id is null then
        raise exception 'unique_violation_without_child for task %', p_task_id;
      end if;
    when others then
      raise exception 'spawn_insert_failed: %', sqlerrm;
  end;

  begin
    insert into public.task_labels (task_id, label_id)
    select v_next_id, tl.label_id
    from public.task_labels tl
    where tl.task_id = p_task_id
    on conflict do nothing;
  exception
    when others then
      raise exception 'label_copy_failed: %', sqlerrm;
  end;

  begin
    insert into public.task_subtasks (
      task_id,
      user_id,
      title,
      completed,
      sort_order
    )
    select
      v_next_id,
      v_uid,
      ts.title,
      false,
      ts.sort_order
    from public.task_subtasks ts
    where ts.task_id = p_task_id
      and ts.user_id = v_uid;
  exception
    when others then
      raise exception 'subtask_copy_failed: %', sqlerrm;
  end;

  update public.tasks
  set completed = true
  where id = p_task_id
    and user_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'already_completed', false,
    'next_task_id', v_next_id,
    'recurrence', v_task.recurrence,
    'due_at', v_task.due_at,
    'next_due_at', v_next_due
  );
end;
$$;

revoke all on function public.complete_task_with_recurrence(uuid) from public;
grant execute on function public.complete_task_with_recurrence(uuid) to authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
